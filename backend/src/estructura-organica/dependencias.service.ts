import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDependenciaDto } from './dto/create-dependencia.dto';
import { UpdateDependenciaDto } from './dto/update-dependencia.dto';

type FindDependenciasInput = {
  tipoProcesoId?: number;
  activo?: boolean;
  search?: string;
};

@Injectable()
export class DependenciasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(filters: FindDependenciasInput, actor: AuthenticatedUser) {
    const where: Prisma.OrgDependenciaWhereInput = {
      ...(!this.authz.isGlobal(actor)
        ? { id: this.getActorDependenciaId(actor) }
        : {}),
      ...(filters.tipoProcesoId ? { tipoProcesoId: filters.tipoProcesoId } : {}),
      ...(filters.activo !== undefined ? { activo: filters.activo } : {}),
      ...(filters.search
        ? {
            OR: [
              { nombre: { contains: filters.search, mode: 'insensitive' } },
              { sigla: { contains: filters.search, mode: 'insensitive' } },
              { responsable: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const data = await this.prisma.orgDependencia.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        tipoProceso: true,
        _count: {
          select: {
            subdirecciones: true,
            rats: true,
          },
        },
      },
    });

    return { data };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    this.authz.assertCanUseDependencia(actor, id);
    const data = await this.prisma.orgDependencia.findUnique({
      where: { id },
      include: {
        tipoProceso: true,
        subdirecciones: {
          orderBy: { nombre: 'asc' },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Dependencia no encontrada');
    }

    return { data };
  }

  async create(dto: CreateDependenciaDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerOrganization(actor);
    await this.ensureTipoProceso(dto.tipoProcesoId);

    const createData: Prisma.OrgDependenciaUncheckedCreateInput = {
      tipoProcesoId: dto.tipoProcesoId,
      nombre: dto.nombre.trim(),
      sigla: dto.sigla?.trim(),
      responsable: dto.responsable?.trim(),
      descripcion: dto.descripcion?.trim(),
      activo: dto.activo ?? true,
    };

    const data = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orgDependencia.create({
        data: createData,
        include: {
          tipoProceso: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'estructura-organica',
        entidad: 'OrgDependencia',
        entidadId: created.id,
        accion: 'CREATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Creacion de dependencia',
        afterData: created,
      });

      return created;
    });

    return { data };
  }

  async update(id: number, dto: UpdateDependenciaDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerOrganization(actor);
    const current = await this.ensureExists(id);

    if (dto.tipoProcesoId !== undefined) {
      await this.ensureTipoProceso(dto.tipoProcesoId);
    }

    const updateData: Prisma.OrgDependenciaUncheckedUpdateInput = {
      ...(dto.tipoProcesoId !== undefined
        ? { tipoProcesoId: dto.tipoProcesoId }
        : {}),
      ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
      ...(dto.sigla !== undefined ? { sigla: dto.sigla?.trim() || null } : {}),
      ...(dto.responsable !== undefined
        ? { responsable: dto.responsable?.trim() || null }
        : {}),
      ...(dto.descripcion !== undefined
        ? { descripcion: dto.descripcion?.trim() || null }
        : {}),
      ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
    };

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.orgDependencia.update({
        where: { id },
        data: updateData,
        include: {
          tipoProceso: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'estructura-organica',
        entidad: 'OrgDependencia',
        entidadId: id,
        accion: 'UPDATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Actualizacion de dependencia',
        beforeData: current,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async findSubdirecciones(id: number, actor: AuthenticatedUser) {
    this.authz.assertCanUseDependencia(actor, id);
    await this.ensureExists(id);

    const data = await this.prisma.orgSubdireccion.findMany({
      where: { dependenciaId: id },
      orderBy: { nombre: 'asc' },
    });

    return { data };
  }

  async findRats(id: number, actor: AuthenticatedUser) {
    this.authz.assertCanUseDependencia(actor, id);
    await this.ensureExists(id);

    const data = await this.prisma.rat.findMany({
      where: { dependenciaId: id },
      orderBy: { nombre: 'asc' },
      include: {
        _count: {
          select: {
            actividades: true,
          },
        },
      },
    });

    return { data };
  }

  private async ensureExists(id: number) {
    const entity = await this.prisma.orgDependencia.findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Dependencia no encontrada');
    }

    return entity;
  }

  private async ensureTipoProceso(id: number) {
    const entity = await this.prisma.orgTipoProceso.findUnique({ where: { id } });

    if (!entity) {
      throw new UnprocessableEntityException('Tipo de proceso no existe');
    }

    return entity;
  }

  private getActorDependenciaId(actor: AuthenticatedUser) {
    if (!actor.dependenciaId) {
      throw new UnprocessableEntityException(
        'El usuario no tiene dependencia asignada para consultar estructura organica.',
      );
    }

    return actor.dependenciaId;
  }
}
