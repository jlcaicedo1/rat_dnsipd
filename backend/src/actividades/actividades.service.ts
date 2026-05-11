import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { ArchiveActividadDto } from './dto/archive-actividad.dto';
import { CreateActividadDto } from './dto/create-actividad.dto';
import { QueryActividadDto } from './dto/query-actividad.dto';
import { UpdateActividadDto } from './dto/update-actividad.dto';

@Injectable()
export class ActividadesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(query: QueryActividadDto, actor: AuthenticatedUser) {
    const where: Prisma.ActividadTratamientoWhereInput = {
      AND: [this.authz.actividadWhere(actor)],
      ...(query.ratId ? { ratId: query.ratId } : {}),
      ...(query.estadoGeneral ? { estadoGeneral: query.estadoGeneral } : {}),
      ...(query.search
        ? {
            OR: [
              { codigo: { contains: query.search, mode: 'insensitive' } },
              { nombre: { contains: query.search, mode: 'insensitive' } },
              { descripcion: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const actividades = await this.prisma.actividadTratamiento.findMany({
      where,
      orderBy: [{ nombre: 'asc' }],
      include: {
        rat: {
          include: {
            dependencia: true,
            subdireccion: true,
          },
        },
        versiones: {
          orderBy: [{ id: 'desc' }],
          take: 1,
        },
      },
    });

    const data = actividades.map((actividad) => ({
      id: actividad.id,
      codigo: actividad.codigo,
      nombre: actividad.nombre,
      descripcion: actividad.descripcion,
      estadoGeneral: actividad.estadoGeneral,
      ratId: actividad.ratId,
      rat: actividad.rat.nombre,
      dependencia: actividad.rat.dependencia.nombre,
      subdireccion: actividad.rat.subdireccion?.nombre ?? null,
      versionActual: actividad.versiones[0]?.numeroVersion ?? null,
      estadoVersionActual: actividad.versiones[0]?.estadoVersion ?? null,
    }));

    return { data };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const data = await this.prisma.actividadTratamiento.findFirst({
      where: {
        id,
        AND: [this.authz.actividadWhere(actor)],
      },
      include: {
        rat: {
          include: {
            dependencia: true,
            subdireccion: true,
          },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return { data };
  }

  async create(
    ratId: number,
    dto: CreateActividadDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAuthorTreatment(actor);
    const rat = await this.ensureRat(ratId, actor);
    await this.ensureCodigoDisponible(ratId, dto.codigo);

    if (rat.estadoGeneral === 'ARCHIVADO') {
      throw new UnprocessableEntityException(
        'No se puede crear una actividad en un RAT archivado',
      );
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const actividad = await tx.actividadTratamiento.create({
        data: {
          ratId,
          codigo: dto.codigo.trim(),
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim(),
          estadoGeneral: 'EN_CONSTRUCCION',
        },
      });

      const versionInicial = await tx.actividadVersion.create({
        data: {
          actividadId: actividad.id,
          numeroVersion: '1.0',
          estadoVersion: 'BORRADOR',
          motivoActualizacion: 'Version inicial',
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividades',
        entidad: 'ActividadTratamiento',
        entidadId: actividad.id,
        accion: 'CREATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Creacion de actividad con version inicial',
        afterData: {
          actividad,
          versionInicial,
        },
        metadata: {
          ratId,
        },
      });

      return {
        ...actividad,
        versionInicial,
      };
    });

    return { data };
  }

  async update(id: number, dto: UpdateActividadDto, actor?: AuthenticatedUser) {
    if (isActivityStatusOnlyUpdate(dto)) {
      this.authz.assertCanManageContentStates(actor);
    } else {
      this.authz.assertCanAuthorTreatment(actor);
    }
    const actividad = await this.ensureExists(id, actor);

    if (dto.codigo !== undefined && dto.codigo !== actividad.codigo) {
      await this.ensureCodigoDisponible(actividad.ratId, dto.codigo, id);
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.actividadTratamiento.update({
        where: { id },
        data: {
          ...(dto.codigo !== undefined ? { codigo: dto.codigo.trim() } : {}),
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: dto.descripcion?.trim() || null }
            : {}),
          ...(dto.estadoGeneral !== undefined
            ? { estadoGeneral: dto.estadoGeneral }
            : {}),
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividades',
        entidad: 'ActividadTratamiento',
        entidadId: id,
        accion: 'UPDATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Actualizacion de actividad',
        beforeData: actividad,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async archive(
    id: number,
    dto: ArchiveActividadDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAdministerWorkflow(actor);
    const existing = await this.ensureExists(id, actor);

    const data = await this.prisma.$transaction(async (tx) => {
      const archived = await tx.actividadTratamiento.update({
        where: { id },
        data: { estadoGeneral: 'ARCHIVADO' },
      });

      await this.audit.log(tx, {
        modulo: 'actividades',
        entidad: 'ActividadTratamiento',
        entidadId: id,
        accion: 'ARCHIVE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Archivo de actividad',
        beforeData: existing,
        afterData: archived,
        metadata: {
          motivo: dto.motivo.trim(),
        },
      });

      return archived;
    });

    return {
      data: {
        ...data,
        motivoArchivo: dto.motivo.trim(),
      },
    };
  }

  async findVersiones(id: number, actor: AuthenticatedUser) {
    await this.ensureExists(id, actor);

    const data = await this.prisma.actividadVersion.findMany({
      where: { actividadId: id },
      orderBy: [{ id: 'desc' }],
      include: {
        baseLicitud: true,
      },
    });

    return { data };
  }

  async detail(id: number, actor: AuthenticatedUser) {
    const actividad = await this.prisma.actividadTratamiento.findFirst({
      where: {
        id,
        AND: [this.authz.actividadWhere(actor)],
      },
      include: {
        rat: {
          include: {
            dependencia: true,
            subdireccion: true,
          },
        },
        versiones: {
          orderBy: [{ id: 'desc' }],
          include: {
            baseLicitud: true,
          },
        },
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }

    const versionActual =
      actividad.versiones.find((version) => version.estadoVersion === 'VIGENTE') ??
      actividad.versiones[0] ??
      null;

    return {
      data: {
        actividad: {
          id: actividad.id,
          codigo: actividad.codigo,
          nombre: actividad.nombre,
          descripcion: actividad.descripcion,
          estadoGeneral: actividad.estadoGeneral,
        },
        rat: {
          id: actividad.rat.id,
          codigo: actividad.rat.codigo,
          nombre: actividad.rat.nombre,
        },
        dependencia: actividad.rat.dependencia,
        subdireccion: actividad.rat.subdireccion,
        versionActual,
        versiones: actividad.versiones,
      },
    };
  }

  private async ensureRat(ratId: number, actor?: AuthenticatedUser) {
    const rat = await this.prisma.rat.findFirst({
      where: {
        id: ratId,
        ...(actor ? { AND: [this.authz.ratWhere(actor)] } : {}),
      },
    });

    if (!rat) {
      throw new NotFoundException('RAT no encontrado');
    }

    return rat;
  }

  private async ensureExists(id: number, actor?: AuthenticatedUser) {
    const actividad = await this.prisma.actividadTratamiento.findFirst({
      where: {
        id,
        ...(actor ? { AND: [this.authz.actividadWhere(actor)] } : {}),
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return actividad;
  }

  private async ensureCodigoDisponible(
    ratId: number,
    codigo: string,
    currentId?: number,
  ) {
    const actividad = await this.prisma.actividadTratamiento.findFirst({
      where: {
        ratId,
        codigo: codigo.trim(),
        ...(currentId ? { id: { not: currentId } } : {}),
      },
    });

    if (actividad) {
      throw new ConflictException(
        'Ya existe una actividad con ese codigo dentro del RAT',
      );
    }
  }
}

function isActivityStatusOnlyUpdate(dto: UpdateActividadDto) {
  return (
    dto.estadoGeneral !== undefined &&
    dto.codigo === undefined &&
    dto.nombre === undefined &&
    dto.descripcion === undefined
  );
}
