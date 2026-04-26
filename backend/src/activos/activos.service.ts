import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActivoDto } from './dto/create-activo.dto';
import { QueryActivoDto } from './dto/query-activo.dto';
import { UpdateActivoDto } from './dto/update-activo.dto';

@Injectable()
export class ActivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findAll(query: QueryActivoDto) {
    const where: Prisma.ActivoInformacionWhereInput = {
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

    const activos = await this.prisma.activoInformacion.findMany({
      where,
      orderBy: [{ nombre: 'asc' }],
      include: {
        actividades: true,
      },
    });

    return {
      data: activos.map((activo) => ({
        id: activo.id,
        codigo: activo.codigo,
        nombre: activo.nombre,
        descripcion: activo.descripcion,
        activo: activo.activo,
        totalUsos: activo.actividades.length,
      })),
    };
  }

  async findOne(id: number) {
    const data = await this.prisma.activoInformacion.findUnique({
      where: { id },
      include: {
        actividades: {
          include: {
            actividadVersion: {
              include: {
                actividad: true,
              },
            },
          },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Activo de informacion no encontrado');
    }

    return { data };
  }

  async create(dto: CreateActivoDto, actor?: AuthenticatedUser) {
    await this.ensureCodigoDisponible(dto.codigo);

    const data = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activoInformacion.create({
        data: {
          codigo: dto.codigo.trim(),
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          activo: true,
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
    const activo = await this.ensureExists(id);

    if (dto.codigo !== undefined && dto.codigo.trim() !== activo.codigo) {
      await this.ensureCodigoDisponible(dto.codigo, id);
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.activoInformacion.update({
        where: { id },
        data: {
          ...(dto.codigo !== undefined ? { codigo: dto.codigo.trim() } : {}),
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: dto.descripcion?.trim() || null }
            : {}),
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
    const existing = await this.ensureExists(id);

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
        descripcion: 'Desactivacion de activo de informacion',
        beforeData: existing,
        afterData: disabled,
      });

      return disabled;
    });

    return { data };
  }

  async findActividadVersiones(id: number) {
    await this.ensureExists(id);

    const data = await this.prisma.actividadActivo.findMany({
      where: { activoId: id },
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

  async ensureExists(id: number) {
    const activo = await this.prisma.activoInformacion.findUnique({
      where: { id },
    });

    if (!activo) {
      throw new NotFoundException('Activo de informacion no encontrado');
    }

    return activo;
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
