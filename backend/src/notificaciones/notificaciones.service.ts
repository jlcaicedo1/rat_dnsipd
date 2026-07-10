import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';

export type CreateNotificacionPayload = {
  tipo: string;
  modulo: string;
  titulo: string;
  mensaje: string;
  de: string;
  motivo?: string;
  entidadId?: number;
  entidadCodigo?: string;
  paraUsuario?: string;
  paraRol?: string;
  paraDependenciaId?: number;
};

@Injectable()
export class NotificacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(payload: CreateNotificacionPayload) {
    return this.prisma.notificacion.create({
      data: {
        tipo: payload.tipo,
        modulo: payload.modulo,
        titulo: payload.titulo,
        mensaje: payload.mensaje,
        de: payload.de,
        motivo: payload.motivo ?? null,
        entidadId: payload.entidadId ?? null,
        entidadCodigo: payload.entidadCodigo ?? null,
        paraUsuario: payload.paraUsuario ?? null,
        paraRol: payload.paraRol ?? null,
        paraDependenciaId: payload.paraDependenciaId ?? null,
      },
    });
  }

  async listar(actor: AuthenticatedUser) {
    const data = await this.prisma.notificacion.findMany({
      where: {
        OR: [
          { paraUsuario: actor.username },
          {
            paraRol: actor.role,
            ...(actor.dependenciaId
              ? { OR: [{ paraDependenciaId: null }, { paraDependenciaId: actor.dependenciaId }] }
              : {}),
          },
        ],
      },
      orderBy: { creadoEn: 'desc' },
      take: 50,
    });
    return { data };
  }

  async contarNoLeidas(actor: AuthenticatedUser) {
    const count = await this.prisma.notificacion.count({
      where: {
        leida: false,
        OR: [
          { paraUsuario: actor.username },
          {
            paraRol: actor.role,
            ...(actor.dependenciaId
              ? { OR: [{ paraDependenciaId: null }, { paraDependenciaId: actor.dependenciaId }] }
              : {}),
          },
        ],
      },
    });
    return { count };
  }

  async marcarLeida(id: number, actor: AuthenticatedUser) {
    await this.prisma.notificacion.updateMany({
      where: {
        id,
        OR: [
          { paraUsuario: actor.username },
          { paraRol: actor.role },
        ],
      },
      data: { leida: true },
    });
    return { ok: true };
  }

  async marcarTodasLeidas(actor: AuthenticatedUser) {
    await this.prisma.notificacion.updateMany({
      where: {
        leida: false,
        OR: [
          { paraUsuario: actor.username },
          { paraRol: actor.role },
        ],
      },
      data: { leida: true },
    });
    return { ok: true };
  }
}
