import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { QueryActivoDto } from './dto/query-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';
import {
  normalizeFreeText,
  normalizeIdentifierText,
  normalizePersonNameList,
  normalizeSentenceText,
  normalizeTitleText,
} from './activos-text.utils';
import {
  calculateAssetValue,
  parseAssetImpactRanges,
  parseAssetValueConfig,
} from './activos-value.utils';

const ASSET_PARAMETER_KEYS = {
  valueConfig: 'VALOR_ACTIVO_CONFIG',
  impactRanges: 'IMPACTO_RANGOS',
} as const;

const ASSET_IMPACT_TYPE = 'IMPACTO_ACTIVO';

type PrismaDbClient = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ActivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(query: QueryActivoDto, actor: AuthenticatedUser) {
    const where: Prisma.ActivoInformacionWhereInput = {
      AND: [this.authz.activoWhere(actor)],
      ...(query.search
        ? {
            OR: [
              { codigo: { contains: query.search, mode: 'insensitive' } },
              { nombre: { contains: query.search, mode: 'insensitive' } },
              { descripcion: { contains: query.search, mode: 'insensitive' } },
              {
                dependenciaNombreFuente: {
                  contains: query.search,
                  mode: 'insensitive',
                },
              },
              { proceso: { contains: query.search, mode: 'insensitive' } },
              { subproceso: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(query.dependenciaId ? { dependenciaId: query.dependenciaId } : {}),
      ...(query.tipoActivoId ? { tipoActivoId: query.tipoActivoId } : {}),
      ...(query.impactoId ? { impactoId: query.impactoId } : {}),
      ...(typeof query.activo === 'boolean' ? { activo: query.activo } : {}),
    };

    const activos = await this.prisma.activoInformacion.findMany({
      where,
      orderBy: [{ nombre: 'asc' }],
      include: {
        dependencia: true,
        tipoActivo: true,
        impacto: true,
        clasificacionInformacion: true,
        fuentesUsuarios: {
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
        actividades: true,
      },
    });

    return {
      data: activos.map((activo) => ({
        id: activo.id,
        codigo: activo.codigo,
        nombre: activo.nombre,
        descripcion: activo.descripcion,
        dependencia:
          activo.dependencia?.nombre ?? activo.dependenciaNombreFuente ?? null,
        siglaDependencia:
          activo.dependencia?.sigla ?? activo.siglaDependenciaFuente ?? null,
        tipoActivo: activo.tipoActivo?.nombre ?? null,
        clasificacionInformacion:
          activo.clasificacionInformacion?.nombre ?? null,
        version: activo.version,
        activo: activo.activo,
        confidencialidad: activo.confidencialidad,
        integridad: activo.integridad,
        disponibilidad: activo.disponibilidad,
        valorActivo: activo.valorActivo,
        impacto: activo.impacto?.nombre ?? null,
        impactoCodigo: activo.impacto?.codigo ?? null,
        totalUsos: activo.actividades.length,
        fuentesUsuarios: activo.fuentesUsuarios.map((item) => item.nombre),
      })),
    };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const data = await this.prisma.activoInformacion.findFirst({
      where: {
        id,
        AND: [this.authz.activoWhere(actor)],
      },
      include: {
        dependencia: true,
        activoPadre: true,
        activosHijos: {
          orderBy: [{ nombre: 'asc' }],
        },
        tipoActivo: true,
        nivel: true,
        ambiente: true,
        clasificacionInformacion: true,
        datosPersonales: true,
        visibleInternet: true,
        fuenteActivo: true,
        bajaProgramada: true,
        propiedadIntelectual: true,
        impacto: true,
        fuentesUsuarios: {
          orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
        },
        actividades: {
          include: {
            actividadVersion: {
              include: {
                actividad: {
                  include: {
                    rat: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Activo de informacion no encontrado');
    }

    return {
      data: {
        ...data,
        fuentesUsuarios: data.fuentesUsuarios.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          orden: item.orden,
        })),
      },
    };
  }

  async create(dto: CreateActivoDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAuthorAssets(actor);
    this.authz.assertCanUseDependencia(actor, dto.dependenciaId);
    await this.ensureCodigoDisponible(dto.codigo);

    const data = await this.prisma.$transaction(async (tx) => {
      await this.assertDependencies(tx, dto, undefined, actor);
      const calculated = await this.resolveCalculatedFields(tx, dto);

      const created = await tx.activoInformacion.create({
        data: {
          ...this.buildCreateData(dto),
          valorActivo: calculated.valorActivo,
          impactoId: calculated.impactoId,
          fuentesUsuarios: {
            create: buildFuenteUsuarioRows(dto.fuentesUsuarios),
          },
        },
        include: {
          fuentesUsuarios: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'activos',
        entidad: 'ActivoInformacion',
        entidadId: created.id,
        accion: 'CREATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Creacion de activo de informacion',
        afterData: created,
      });

      return created;
    });

    return { data };
  }

  async update(id: number, dto: UpdateActivoDto, actor?: AuthenticatedUser) {
    if (isActivoStatusOnlyUpdate(dto)) {
      this.authz.assertCanManageAssets(actor);
    } else {
      this.authz.assertCanAuthorAssets(actor);
    }
    const activo = await this.ensureExists(id, actor);
    this.authz.assertCanUseDependencia(
      actor,
      dto.dependenciaId !== undefined ? dto.dependenciaId : activo.dependenciaId,
    );

    if (dto.codigo !== undefined && dto.codigo.trim() !== activo.codigo) {
      await this.ensureCodigoDisponible(dto.codigo, id);
    }

    const data = await this.prisma.$transaction(async (tx) => {
      await this.assertDependencies(tx, dto, id, actor);
      const current = await tx.activoInformacion.findUniqueOrThrow({
        where: { id },
      });
      const merged = mergeActivoForCalculation(current, dto);
      const calculated = await this.resolveCalculatedFields(tx, merged);

      if (dto.fuentesUsuarios !== undefined) {
        await tx.activoFuenteUsuario.deleteMany({
          where: { activoId: id },
        });
      }

      const updated = await tx.activoInformacion.update({
        where: { id },
        data: {
          ...this.buildUpdateData(dto),
          valorActivo: calculated.valorActivo,
          impactoId: calculated.impactoId,
          ...(dto.fuentesUsuarios !== undefined
            ? {
                fuentesUsuarios: {
                  create: buildFuenteUsuarioRows(dto.fuentesUsuarios),
                },
              }
            : {}),
        },
        include: {
          fuentesUsuarios: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'activos',
        entidad: 'ActivoInformacion',
        entidadId: id,
        accion: 'UPDATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Actualizacion de activo de informacion',
        beforeData: activo,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async disable(id: number, actor?: AuthenticatedUser) {
    this.authz.assertCanManageAssets(actor);
    const existing = await this.ensureExists(id, actor);

    const data = await this.prisma.$transaction(async (tx) => {
      const disabled = await tx.activoInformacion.update({
        where: { id },
        data: { activo: false },
      });

      await this.audit.log(tx, {
        modulo: 'activos',
        entidad: 'ActivoInformacion',
        entidadId: id,
        accion: 'DISABLE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Baja logica de activo de informacion',
        beforeData: existing,
        afterData: disabled,
      });

      return disabled;
    });

    return { data };
  }

  async findActividadVersiones(id: number, actor: AuthenticatedUser) {
    await this.ensureExists(id, actor);

    const data = await this.prisma.actividadActivo.findMany({
      where: {
        activoId: id,
        actividadVersion: {
          actividad: this.authz.actividadWhere(actor),
        },
      },
      include: {
        actividadVersion: {
          include: {
            actividad: {
              include: {
                rat: true,
              },
            },
          },
        },
      },
      orderBy: [{ id: 'desc' }],
    });

    return { data };
  }

  async ensureExists(id: number, actor?: AuthenticatedUser) {
    const activo = await this.prisma.activoInformacion.findFirst({
      where: {
        id,
        ...(actor ? { AND: [this.authz.activoWhere(actor)] } : {}),
      },
    });

    if (!activo) {
      throw new NotFoundException('Activo de informacion no encontrado');
    }

    return activo;
  }

  private async resolveCalculatedFields(
    tx: PrismaDbClient,
    input: {
      confidencialidad?: number | null;
      integridad?: number | null;
      disponibilidad?: number | null;
    },
  ) {
    const [valueConfigParameter, impactRangeParameter] = await Promise.all([
      tx.parametroSistema.findUnique({
        where: {
          modulo_clave: {
            modulo: 'ACTIVOS',
            clave: ASSET_PARAMETER_KEYS.valueConfig,
          },
        },
      }),
      tx.parametroSistema.findUnique({
        where: {
          modulo_clave: {
            modulo: 'ACTIVOS',
            clave: ASSET_PARAMETER_KEYS.impactRanges,
          },
        },
      }),
    ]);

    const result = calculateAssetValue({
      confidencialidad: input.confidencialidad,
      integridad: input.integridad,
      disponibilidad: input.disponibilidad,
      config: parseAssetValueConfig(valueConfigParameter?.valor),
      impactRanges: parseAssetImpactRanges(impactRangeParameter?.valor),
    });

    if (!result.impactoCodigo) {
      return {
        valorActivo: result.valorActivo,
        impactoId: null,
      };
    }

    const impacto = await tx.catalogo.findFirst({
      where: {
        tipo: ASSET_IMPACT_TYPE,
        codigo: result.impactoCodigo,
      },
      select: { id: true },
    });

    return {
      valorActivo: result.valorActivo,
      impactoId: impacto?.id ?? null,
    };
  }

  private async assertDependencies(
    tx: PrismaDbClient,
    dto: Partial<CreateActivoDto>,
    currentId?: number,
    actor?: AuthenticatedUser,
  ) {
    if (dto.dependenciaId) {
      const dependencia = await tx.orgDependencia.findUnique({
        where: { id: dto.dependenciaId },
        select: { id: true },
      });

      if (!dependencia) {
        throw new NotFoundException('La dependencia indicada no existe.');
      }
    }

    if (dto.activoPadreId) {
      if (currentId && dto.activoPadreId === currentId) {
        throw new ConflictException(
          'Un activo no puede referenciarse a si mismo como padre.',
        );
      }

      const activoPadre = await tx.activoInformacion.findUnique({
        where: { id: dto.activoPadreId },
        select: { id: true, dependenciaId: true },
      });

      if (!activoPadre) {
        throw new NotFoundException('El activo padre indicado no existe.');
      }

      if (actor) {
        this.authz.assertCanUseDependencia(actor, activoPadre.dependenciaId);
      }
    }

    await Promise.all([
      this.assertCatalogId(tx, dto.tipoActivoId, 'tipo de activo'),
      this.assertCatalogId(tx, dto.nivelId, 'nivel del activo'),
      this.assertCatalogId(tx, dto.ambienteId, 'ambiente del activo'),
      this.assertCatalogId(
        tx,
        dto.clasificacionInfoId,
        'clasificacion de informacion del activo',
      ),
      this.assertCatalogId(tx, dto.datosPersonalesId, 'datos personales'),
      this.assertCatalogId(tx, dto.visibleInternetId, 'visibilidad en internet'),
      this.assertCatalogId(tx, dto.fuenteActivoId, 'fuente del activo'),
      this.assertCatalogId(tx, dto.bajaProgramadaId, 'baja programada'),
      this.assertCatalogId(
        tx,
        dto.propiedadIntelectualId,
        'propiedad intelectual',
      ),
    ]);
  }

  private async assertCatalogId(
    tx: PrismaDbClient,
    id: number | undefined,
    label: string,
  ) {
    if (!id) {
      return;
    }

    const catalogo = await tx.catalogo.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!catalogo) {
      throw new NotFoundException(`No existe el catalogo asociado a ${label}.`);
    }
  }

  private buildCreateData(
    dto: CreateActivoDto,
  ): Prisma.ActivoInformacionUncheckedCreateInput {
    return {
      codigo: normalizeIdentifierText(dto.codigo) ?? dto.codigo.trim(),
      nombre: normalizeTitleText(dto.nombre) ?? dto.nombre.trim(),
      codigoActivoPadreExterno: normalizeIdentifierText(
        dto.codigoActivoPadreExterno,
      ),
      dependenciaNombreFuente: normalizeTitleText(dto.dependenciaNombreFuente),
      siglaDependenciaFuente: normalizeIdentifierText(dto.siglaDependenciaFuente),
      descripcion: normalizeSentenceText(dto.descripcion),
      version: normalizeFreeText(dto.version),
      macroproceso: normalizeTitleText(dto.macroproceso),
      proceso: normalizeTitleText(dto.proceso),
      subproceso: normalizeTitleText(dto.subproceso),
      usoOtrasAreasProcesos: normalizeTitleText(dto.usoOtrasAreasProcesos),
      direccionIpUrl: normalizeFreeText(dto.direccionIpUrl),
      propietarioActivo: normalizeTitleText(dto.propietarioActivo),
      unidadPropietariaActivo: normalizeTitleText(dto.unidadPropietariaActivo),
      custodio: normalizeTitleText(dto.custodio),
      areaCustodio: normalizeTitleText(dto.areaCustodio),
      ubicacion: normalizeTitleText(dto.ubicacion),
      controlesExistentes: normalizeSentenceText(dto.controlesExistentes),
      observaciones: normalizeSentenceText(dto.observaciones),
      historico: normalizeSentenceText(dto.historico),
      fechaLevantamiento: dto.fechaLevantamiento
        ? new Date(dto.fechaLevantamiento)
        : null,
      confidencialidad: dto.confidencialidad ?? null,
      integridad: dto.integridad ?? null,
      disponibilidad: dto.disponibilidad ?? null,
      activo: dto.activo ?? true,
      dependenciaId: dto.dependenciaId ?? null,
      activoPadreId: dto.activoPadreId ?? null,
      tipoActivoId: dto.tipoActivoId ?? null,
      nivelId: dto.nivelId ?? null,
      ambienteId: dto.ambienteId ?? null,
      clasificacionInfoId: dto.clasificacionInfoId ?? null,
      datosPersonalesId: dto.datosPersonalesId ?? null,
      visibleInternetId: dto.visibleInternetId ?? null,
      fuenteActivoId: dto.fuenteActivoId ?? null,
      bajaProgramadaId: dto.bajaProgramadaId ?? null,
      propiedadIntelectualId: dto.propiedadIntelectualId ?? null,
    };
  }

  private buildUpdateData(
    dto: UpdateActivoDto,
  ): Prisma.ActivoInformacionUncheckedUpdateInput {
    const data: Prisma.ActivoInformacionUncheckedUpdateInput = {};

    if (dto.codigo !== undefined) {
      data.codigo = normalizeIdentifierText(dto.codigo) ?? dto.codigo.trim();
    }
    if (dto.nombre !== undefined) {
      data.nombre = normalizeTitleText(dto.nombre) ?? dto.nombre.trim();
    }
    if (dto.codigoActivoPadreExterno !== undefined) {
      data.codigoActivoPadreExterno = normalizeIdentifierText(
        dto.codigoActivoPadreExterno,
      );
    }
    if (dto.dependenciaNombreFuente !== undefined) {
      data.dependenciaNombreFuente = normalizeTitleText(
        dto.dependenciaNombreFuente,
      );
    }
    if (dto.siglaDependenciaFuente !== undefined) {
      data.siglaDependenciaFuente = normalizeIdentifierText(
        dto.siglaDependenciaFuente,
      );
    }
    if (dto.descripcion !== undefined) {
      data.descripcion = normalizeSentenceText(dto.descripcion);
    }
    if (dto.version !== undefined) data.version = normalizeFreeText(dto.version);
    if (dto.macroproceso !== undefined) {
      data.macroproceso = normalizeTitleText(dto.macroproceso);
    }
    if (dto.proceso !== undefined) data.proceso = normalizeTitleText(dto.proceso);
    if (dto.subproceso !== undefined) {
      data.subproceso = normalizeTitleText(dto.subproceso);
    }
    if (dto.usoOtrasAreasProcesos !== undefined) {
      data.usoOtrasAreasProcesos = normalizeTitleText(
        dto.usoOtrasAreasProcesos,
      );
    }
    if (dto.direccionIpUrl !== undefined) {
      data.direccionIpUrl = normalizeFreeText(dto.direccionIpUrl);
    }
    if (dto.propietarioActivo !== undefined) {
      data.propietarioActivo = normalizeTitleText(dto.propietarioActivo);
    }
    if (dto.unidadPropietariaActivo !== undefined) {
      data.unidadPropietariaActivo = normalizeTitleText(
        dto.unidadPropietariaActivo,
      );
    }
    if (dto.custodio !== undefined) {
      data.custodio = normalizeTitleText(dto.custodio);
    }
    if (dto.areaCustodio !== undefined) {
      data.areaCustodio = normalizeTitleText(dto.areaCustodio);
    }
    if (dto.ubicacion !== undefined) {
      data.ubicacion = normalizeTitleText(dto.ubicacion);
    }
    if (dto.controlesExistentes !== undefined) {
      data.controlesExistentes = normalizeSentenceText(
        dto.controlesExistentes,
      );
    }
    if (dto.observaciones !== undefined) {
      data.observaciones = normalizeSentenceText(dto.observaciones);
    }
    if (dto.historico !== undefined) {
      data.historico = normalizeSentenceText(dto.historico);
    }
    if (dto.fechaLevantamiento !== undefined) {
      data.fechaLevantamiento = dto.fechaLevantamiento
        ? new Date(dto.fechaLevantamiento)
        : null;
    }
    if (dto.confidencialidad !== undefined) data.confidencialidad = dto.confidencialidad;
    if (dto.integridad !== undefined) data.integridad = dto.integridad;
    if (dto.disponibilidad !== undefined) data.disponibilidad = dto.disponibilidad;
    if (dto.activo !== undefined) data.activo = dto.activo;

    if (dto.dependenciaId !== undefined) data.dependenciaId = dto.dependenciaId > 0 ? dto.dependenciaId : null;
    if (dto.activoPadreId !== undefined) data.activoPadreId = dto.activoPadreId > 0 ? dto.activoPadreId : null;
    if (dto.tipoActivoId !== undefined) data.tipoActivoId = dto.tipoActivoId > 0 ? dto.tipoActivoId : null;
    if (dto.nivelId !== undefined) data.nivelId = dto.nivelId > 0 ? dto.nivelId : null;
    if (dto.ambienteId !== undefined) data.ambienteId = dto.ambienteId > 0 ? dto.ambienteId : null;
    if (dto.clasificacionInfoId !== undefined) data.clasificacionInfoId = dto.clasificacionInfoId > 0 ? dto.clasificacionInfoId : null;
    if (dto.datosPersonalesId !== undefined) data.datosPersonalesId = dto.datosPersonalesId > 0 ? dto.datosPersonalesId : null;
    if (dto.visibleInternetId !== undefined) data.visibleInternetId = dto.visibleInternetId > 0 ? dto.visibleInternetId : null;
    if (dto.fuenteActivoId !== undefined) data.fuenteActivoId = dto.fuenteActivoId > 0 ? dto.fuenteActivoId : null;
    if (dto.bajaProgramadaId !== undefined) data.bajaProgramadaId = dto.bajaProgramadaId > 0 ? dto.bajaProgramadaId : null;
    if (dto.propiedadIntelectualId !== undefined) data.propiedadIntelectualId = dto.propiedadIntelectualId > 0 ? dto.propiedadIntelectualId : null;

    return data;
  }

  private async ensureCodigoDisponible(codigo: string, currentId?: number) {
    const activo = await this.prisma.activoInformacion.findFirst({
      where: {
        codigo: codigo.trim(),
        ...(currentId ? { id: { not: currentId } } : {}),
      },
    });

    if (activo) {
      throw new ConflictException('Ya existe un activo con ese codigo');
    }
  }
}

function buildFuenteUsuarioRows(values?: string[]) {
  const uniqueNames = normalizePersonNameList(values);

  return uniqueNames.map((nombre, index) => ({
    nombre,
    orden: index + 1,
  }));
}

function mergeActivoForCalculation(
  current: {
    confidencialidad: number | null;
    integridad: number | null;
    disponibilidad: number | null;
  },
  dto: UpdateActivoDto,
) {
  return {
    confidencialidad:
      dto.confidencialidad !== undefined
        ? dto.confidencialidad
        : current.confidencialidad,
    integridad:
      dto.integridad !== undefined ? dto.integridad : current.integridad,
    disponibilidad:
      dto.disponibilidad !== undefined
        ? dto.disponibilidad
        : current.disponibilidad,
  };
}

function isActivoStatusOnlyUpdate(dto: UpdateActivoDto) {
  const keys = Object.keys(dto) as Array<keyof UpdateActivoDto>;

  return keys.length === 1 && dto.activo !== undefined;
}
