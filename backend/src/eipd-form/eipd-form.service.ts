import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEipdFormDto } from './dto/create-eipd-form.dto';
import { UpsertEipdFormDto } from './dto/upsert-eipd-form.dto';

type Json = Prisma.InputJsonValue;

const DELETABLE_ESTADOS = ['BORRADOR', 'EN_ELABORACION', 'DEVUELTO'];
const ADMIN_ROLES = ['ADMIN_TECNICO', 'ADMIN', 'ADMINISTRADOR'];

function isAdminTecnico(role: string) {
  const r = role.toUpperCase().replace(/[̀-ͯ]/g, '');
  return ADMIN_ROLES.some((a) => r.includes(a) && (r.includes('TECNICO') || r === 'ADMIN'));
}

function isRevisor(role: string) {
  const r = role.toUpperCase();
  return r === 'REVISOR' || r.startsWith('REVISOR_');
}

const ACTIVIDAD_VERSION_SELECT = {
  id: true,
  numeroVersion: true,
  requiereEipd: true,
  actividad: {
    select: {
      id: true,
      codigo: true,
      nombre: true,
      rat: {
        select: {
          id: true,
          codigo: true,
          nombre: true,
          dependencia: { select: { id: true, nombre: true, sigla: true } },
        },
      },
    },
  },
} as const;

@Injectable()
export class EipdFormService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async create(dto: CreateEipdFormDto, actor: AuthenticatedUser) {
    if (isRevisor(actor.role)) {
      throw new ForbiddenException('El rol Revisor no puede crear formularios EIPD');
    }

    if (dto.actividadVersionId) {
      const existing = await this.prisma.eipdFormDoc.findUnique({
        where: { actividadVersionId: dto.actividadVersionId },
      });
      if (existing) {
        throw new ConflictException('Ya existe un formulario EIPD asociado a esta versión de actividad');
      }
    }

    const year = new Date().getFullYear();
    const prefix = `EIPDP-${year}-`;
    const existing = await this.prisma.eipdFormDoc.findMany({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
    });
    const maxSeq = existing.reduce((max, r) => {
      const n = parseInt(r.codigo.slice(prefix.length), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const codigo = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;

    const data = await this.prisma.eipdFormDoc.create({
      data: {
        codigo,
        titulo: dto.titulo?.trim() || null,
        createdById: actor.sub,
        ...(dto.actividadVersionId ? { actividadVersionId: dto.actividadVersionId } : {}),
      },
      include: { actividadVersion: { select: ACTIVIDAD_VERSION_SELECT } },
    });
    return { data };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const where = isRevisor(actor.role)
      ? { id, deletedAt: null }
      : { id, createdById: actor.sub, deletedAt: null };
    const data = await this.prisma.eipdFormDoc.findFirst({
      where,
      include: { actividadVersion: { select: ACTIVIDAD_VERSION_SELECT } },
    });
    if (!data) throw new NotFoundException('Formulario EIPD no encontrado');
    return { data };
  }

  async findByActividadVersion(actividadVersionId: number, actor: AuthenticatedUser) {
    const data = await this.prisma.eipdFormDoc.findUnique({
      where: { actividadVersionId },
      include: { actividadVersion: { select: ACTIVIDAD_VERSION_SELECT } },
    });
    return { data: data ?? null };
  }

  async findOrCreateMine(actor: AuthenticatedUser) {
    const existing = await this.prisma.eipdFormDoc.findFirst({
      where: { createdById: actor.sub, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { actividadVersion: { select: ACTIVIDAD_VERSION_SELECT } },
    });
    if (existing) return { data: existing };
    return this.create({}, actor);
  }

  async update(id: number, dto: UpsertEipdFormDto, actor: AuthenticatedUser) {
    const before = await this.prisma.eipdFormDoc.findFirst({ where: { id }, select: { estado: true, codigo: true, dependenciaId: true } });

    const data = await this.prisma.eipdFormDoc.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(dto.formFields !== undefined ? { formFields: dto.formFields as Json } : {}),
        ...(dto.s2State !== undefined ? { s2State: dto.s2State as Json } : {}),
        ...(dto.s3State !== undefined ? { s3State: dto.s3State as Json } : {}),
        ...(dto.datosRows !== undefined ? { datosRows: dto.datosRows as Json } : {}),
        ...(dto.activosRows !== undefined ? { activosRows: dto.activosRows as Json } : {}),
        ...(dto.s4Rows !== undefined ? { s4Rows: dto.s4Rows as Json } : {}),
        ...(dto.s5Rows !== undefined ? { s5Rows: dto.s5Rows as Json } : {}),
        ...(dto.s6Rows !== undefined ? { s6Rows: dto.s6Rows as Json } : {}),
        updatedById: actor.sub,
      },
      include: { actividadVersion: { select: ACTIVIDAD_VERSION_SELECT } },
    });

    if (dto.estado && before?.estado !== dto.estado) {
      const motivo = (dto as unknown as Record<string, string>).motivo ?? undefined;
      const codigo = data.codigo;
      const depId = data.dependenciaId ?? undefined;

      if (dto.estado === 'EN_REVISION') {
        await this.notificaciones.crear({ tipo: 'EIPD_ENVIADA_REVISION', modulo: 'eipd', titulo: 'EIPD enviada a revision', mensaje: `El formulario EIPD ${codigo} fue enviado para revision.`, de: actor.username, motivo, entidadId: id, entidadCodigo: codigo, paraRol: 'REVISOR', paraDependenciaId: depId });
      } else if (dto.estado === 'APROBADO') {
        await this.notificaciones.crear({ tipo: 'EIPD_APROBADA', modulo: 'eipd', titulo: 'EIPD aprobada', mensaje: `El formulario EIPD ${codigo} fue aprobado.`, de: actor.username, motivo, entidadId: id, entidadCodigo: codigo, paraRol: 'OPERADOR', paraDependenciaId: depId });
      } else if (dto.estado === 'DEVUELTO') {
        await this.notificaciones.crear({ tipo: 'EIPD_DEVUELTA', modulo: 'eipd', titulo: 'EIPD devuelta para correccion', mensaje: `El formulario EIPD ${codigo} fue devuelto por el revisor.`, de: actor.username, motivo, entidadId: id, entidadCodigo: codigo, paraRol: 'OPERADOR', paraDependenciaId: depId });
      }
    }

    return { data };
  }

  async list(actor: AuthenticatedUser) {
    const revisorView = isRevisor(actor.role);
    const where = revisorView
      ? { deletedAt: null }
      : { createdById: actor.sub, deletedAt: null };

    const rows = await this.prisma.eipdFormDoc.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        codigo: true,
        titulo: true,
        estado: true,
        createdAt: true,
        updatedAt: true,
        createdById: true,
        actividadVersionId: true,
        actividadVersion: {
          select: {
            id: true,
            numeroVersion: true,
            actividad: {
              select: {
                id: true,
                codigo: true,
                nombre: true,
                rat: {
                  select: {
                    id: true,
                    codigo: true,
                    dependencia: { select: { id: true, nombre: true, sigla: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!revisorView) return { data: rows };

    const userIds = [...new Set(rows.map((r) => r.createdById))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        nombre: true,
        dependencia: { select: { id: true, nombre: true, sigla: true } },
      },
    });
    const userMap = new Map(users.map((u) => [u.id, { nombre: u.nombre, dependencia: u.dependencia }]));
    const data = rows.map((r) => {
      const creator = userMap.get(r.createdById);
      return {
        ...r,
        createdByNombre: creator?.nombre ?? null,
        createdByDependencia: creator?.dependencia ?? null,
      };
    });
    return { data };
  }

  async softDelete(id: number, actor: AuthenticatedUser) {
    const doc = await this.prisma.eipdFormDoc.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Formulario EIPD no encontrado');

    const isTecnico = isAdminTecnico(actor.role);
    const isOwner = doc.createdById === actor.sub;

    if (!isTecnico) {
      if (!isOwner) throw new ForbiddenException('Solo puede eliminar sus propios formularios');
      if (!DELETABLE_ESTADOS.includes(doc.estado)) {
        throw new ForbiddenException(
          `No se puede eliminar un formulario en estado "${doc.estado}". Solo se puede eliminar en BORRADOR o EN_ELABORACION.`,
        );
      }
    }

    const data = await this.prisma.eipdFormDoc.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actor.sub },
    });
    return { data: { id: data.id, codigo: data.codigo, deletedAt: data.deletedAt } };
  }
}
