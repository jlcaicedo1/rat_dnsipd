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
import { CreateSubdireccionDto } from './dto/create-subdireccion.dto';
import { UpdateSubdireccionDto } from './dto/update-subdireccion.dto';

type FindSubdireccionesInput = {
  dependenciaId?: number;
  activo?: boolean;
  search?: string;
};

@Injectable()
export class SubdireccionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(filters: FindSubdireccionesInput, actor: AuthenticatedUser) {
    const dependenciaId = this.authz.isGlobal(actor)
      ? filters.dependenciaId
      : this.getActorDependenciaId(actor);
    const where: Prisma.OrgSubdireccionWhereInput = {
      ...(dependenciaId ? { dependenciaId } : {}),
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

    const data = await this.prisma.orgSubdireccion.findMany({
      where,
      orderBy: { nombre: 'asc' },
      include: {
        dependencia: true,
        _count: {
          select: {
            rats: true,
          },
        },
      },
    });

    return { data };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const data = await this.prisma.orgSubdireccion.findUnique({
      where: { id },
      include: {
        dependencia: true,
      },
    });

    if (!data) {
      throw new NotFoundException('Subdireccion no encontrada');
    }

    this.authz.assertCanUseDependencia(actor, data.dependenciaId);

    return { data };
  }

  async create(dto: CreateSubdireccionDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerOrganization(actor);
    await this.ensureDependencia(dto.dependenciaId);

    const createData: Prisma.OrgSubdireccionUncheckedCreateInput = {
      dependenciaId: dto.dependenciaId,
      nombre: dto.nombre.trim(),
      sigla: dto.sigla?.trim(),
      responsable: dto.responsable?.trim(),
      descripcion: dto.descripcion?.trim(),
      activo: dto.activo ?? true,
    };

    const data = await this.prisma.$transaction(async (tx) => {
      const created = await tx.orgSubdireccion.create({
        data: createData,
        include: {
          dependencia: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'estructura-organica',
        entidad: 'OrgSubdireccion',
        entidadId: created.id,
        accion: 'CREATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Creacion de subdireccion',
        afterData: created,
      });

      return created;
    });

    return { data };
  }

  async update(id: number, dto: UpdateSubdireccionDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerOrganization(actor);
    const current = await this.ensureExists(id);

    if (dto.dependenciaId !== undefined) {
      await this.ensureDependencia(dto.dependenciaId);
    }

    const updateData: Prisma.OrgSubdireccionUncheckedUpdateInput = {
      ...(dto.dependenciaId !== undefined
        ? { dependenciaId: dto.dependenciaId }
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
      const updated = await tx.orgSubdireccion.update({
        where: { id },
        data: updateData,
        include: {
          dependencia: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'estructura-organica',
        entidad: 'OrgSubdireccion',
        entidadId: id,
        accion: 'UPDATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Actualizacion de subdireccion',
        beforeData: current,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async findRats(id: number, actor: AuthenticatedUser) {
    const subdireccion = await this.ensureExists(id);
    this.authz.assertCanUseDependencia(actor, subdireccion.dependenciaId);

    const data = await this.prisma.rat.findMany({
      where: { subdireccionId: id },
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
    const entity = await this.prisma.orgSubdireccion.findUnique({ where: { id } });

    if (!entity) {
      throw new NotFoundException('Subdireccion no encontrada');
    }

    return entity;
  }

  private getActorDependenciaId(actor: AuthenticatedUser) {
    if (!actor.dependenciaId) {
      throw new UnprocessableEntityException(
        'El usuario no tiene dependencia asignada para consultar subdirecciones.',
      );
    }

    return actor.dependenciaId;
  }

  private async ensureDependencia(id: number) {
    const entity = await this.prisma.orgDependencia.findUnique({ where: { id } });

    if (!entity) {
      throw new UnprocessableEntityException('Dependencia no existe');
    }

    return entity;
  }
}
