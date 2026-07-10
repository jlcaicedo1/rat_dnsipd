import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChecklistDpdDto } from './dto/create-checklist-dpd.dto';
import { UpsertChecklistDpdDto } from './dto/upsert-checklist-dpd.dto';

type Json = Prisma.InputJsonValue;

const DELETABLE_ESTADOS = ['BORRADOR', 'DEVUELTO'];
const ADMIN_ROLES = ['ADMIN_TECNICO', 'ADMIN', 'ADMINISTRADOR'];

function isAdminTecnico(role: string) {
  const r = role.toUpperCase().replace(/[̀-ͯ]/g, '');
  return ADMIN_ROLES.some((a) => r.includes(a) && (r.includes('TECNICO') || r === 'ADMIN'));
}

function isRevisor(role: string) {
  const r = role.toUpperCase();
  return r === 'REVISOR' || r.startsWith('REVISOR_');
}

@Injectable()
export class ChecklistDpdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificaciones: NotificacionesService,
  ) {}

  async create(dto: CreateChecklistDpdDto, actor: AuthenticatedUser) {
    if (isRevisor(actor.role)) {
      throw new ForbiddenException('El rol Revisor no puede crear checklists Diseño Defecto');
    }
    const year = new Date().getFullYear();
    const prefix = `CKL-DPD-${year}-`;
    const existing = await this.prisma.checklistDpd.findMany({
      where: { codigo: { startsWith: prefix } },
      select: { codigo: true },
    });
    const maxSeq = existing.reduce((max, r) => {
      const n = parseInt(r.codigo.slice(prefix.length), 10);
      return isNaN(n) ? max : Math.max(max, n);
    }, 0);
    const codigo = `${prefix}${String(maxSeq + 1).padStart(3, '0')}`;

    const data = await this.prisma.checklistDpd.create({
      data: {
        codigo,
        titulo: dto.titulo?.trim() || null,
        createdById: actor.sub,
      },
    });
    return { data };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const where = isRevisor(actor.role)
      ? { id, deletedAt: null }
      : { id, createdById: actor.sub, deletedAt: null };
    const data = await this.prisma.checklistDpd.findFirst({ where });
    if (!data) throw new NotFoundException('Checklist Diseño Defecto no encontrado');
    return { data };
  }

  async findOrCreateMine(actor: AuthenticatedUser) {
    const existing = await this.prisma.checklistDpd.findFirst({
      where: { createdById: actor.sub, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) return { data: existing };
    return this.create({}, actor);
  }

  async update(id: number, dto: UpsertChecklistDpdDto, actor: AuthenticatedUser) {
    const before = await this.prisma.checklistDpd.findFirst({ where: { id }, select: { estado: true, codigo: true, dependenciaId: true } });

    const data = await this.prisma.checklistDpd.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined ? { titulo: dto.titulo } : {}),
        ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        ...(dto.formData !== undefined ? { formData: dto.formData as Json } : {}),
        ...(dto.controles !== undefined ? { controles: dto.controles as Json } : {}),
        ...(dto.planRows !== undefined ? { planRows: dto.planRows as Json } : {}),
        updatedById: actor.sub,
      },
    });

    if (dto.estado && before?.estado !== dto.estado) {
      const motivo = (dto as unknown as Record<string, string>).motivo ?? undefined;
      const codigo = data.codigo;
      const depId = data.dependenciaId ?? undefined;

      if (dto.estado === 'EN_REVISION') {
        await this.notificaciones.crear({ tipo: 'CHECKLIST_ENVIADO_REVISION', modulo: 'checklist-dpd', titulo: 'Checklist enviado a revision', mensaje: `El checklist DPD ${codigo} fue enviado para revision.`, de: actor.username, motivo, entidadId: id, entidadCodigo: codigo, paraRol: 'REVISOR', paraDependenciaId: depId });
      } else if (dto.estado === 'APROBADO') {
        await this.notificaciones.crear({ tipo: 'CHECKLIST_APROBADO', modulo: 'checklist-dpd', titulo: 'Checklist aprobado', mensaje: `El checklist DPD ${codigo} fue aprobado.`, de: actor.username, motivo, entidadId: id, entidadCodigo: codigo, paraRol: 'OPERADOR', paraDependenciaId: depId });
      } else if (dto.estado === 'DEVUELTO') {
        await this.notificaciones.crear({ tipo: 'CHECKLIST_DEVUELTO', modulo: 'checklist-dpd', titulo: 'Checklist devuelto para correccion', mensaje: `El checklist DPD ${codigo} fue devuelto por el revisor.`, de: actor.username, motivo, entidadId: id, entidadCodigo: codigo, paraRol: 'OPERADOR', paraDependenciaId: depId });
      }
    }

    return { data };
  }

  async list(actor: AuthenticatedUser) {
    const revisorView = isRevisor(actor.role);
    const where = revisorView
      ? { deletedAt: null }
      : { createdById: actor.sub, deletedAt: null };

    const rows = await this.prisma.checklistDpd.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, codigo: true, titulo: true, estado: true, createdAt: true, updatedAt: true, createdById: true },
    });

    if (!revisorView) return { data: rows };

    const userIds = [...new Set(rows.map((r) => r.createdById))];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nombre: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.nombre]));
    const data = rows.map((r) => ({ ...r, createdByNombre: userMap.get(r.createdById) ?? null }));
    return { data };
  }

  async softDelete(id: number, actor: AuthenticatedUser) {
    const doc = await this.prisma.checklistDpd.findFirst({
      where: { id, deletedAt: null },
    });
    if (!doc) throw new NotFoundException('Checklist Diseño Defecto no encontrado');

    const isTecnico = isAdminTecnico(actor.role);
    const isOwner = doc.createdById === actor.sub;

    if (!isTecnico) {
      if (!isOwner) throw new ForbiddenException('Solo puede eliminar sus propios checklists');
      if (!DELETABLE_ESTADOS.includes(doc.estado)) {
        throw new ForbiddenException(`No se puede eliminar un checklist en estado "${doc.estado}". Solo se puede eliminar en BORRADOR.`);
      }
    }

    const data = await this.prisma.checklistDpd.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: actor.sub },
    });
    return { data: { id: data.id, codigo: data.codigo, deletedAt: data.deletedAt } };
  }
}
