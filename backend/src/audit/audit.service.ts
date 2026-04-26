import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';

type AuditDbClient = PrismaService | Prisma.TransactionClient;

type AuditLogPayload = {
  modulo: string;
  entidad: string;
  entidadId?: string | number | null;
  accion: string;
  actor?: string;
  actorRole?: string;
  descripcion?: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAuditLogDto) {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.modulo ? { modulo: query.modulo } : {}),
      ...(query.entidad ? { entidad: query.entidad } : {}),
      ...(query.entidadId ? { entidadId: query.entidadId } : {}),
      ...(query.accion ? { accion: query.accion } : {}),
      ...(query.actor ? { actor: query.actor } : {}),
      ...(query.search
        ? {
            OR: [
              { modulo: { contains: query.search, mode: 'insensitive' } },
              { entidad: { contains: query.search, mode: 'insensitive' } },
              { accion: { contains: query.search, mode: 'insensitive' } },
              { actor: { contains: query.search, mode: 'insensitive' } },
              { descripcion: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const data = await this.prisma.auditLog.findMany({
      where,
      orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    });

    return { data };
  }

  async findOne(id: number) {
    const data = await this.prisma.auditLog.findUnique({
      where: { id },
    });

    if (!data) {
      throw new NotFoundException('Registro de auditoria no encontrado');
    }

    return { data };
  }

  async log(db: AuditDbClient, payload: AuditLogPayload) {
    return db.auditLog.create({
      data: {
        modulo: payload.modulo,
        entidad: payload.entidad,
        ...(payload.entidadId !== undefined && payload.entidadId !== null
          ? { entidadId: String(payload.entidadId) }
          : {}),
        accion: payload.accion,
        actor: payload.actor?.trim() || 'system',
        ...(payload.actorRole ? { actorRole: payload.actorRole.trim() } : {}),
        ...(payload.descripcion
          ? { descripcion: payload.descripcion.trim() }
          : {}),
        ...(payload.beforeData !== undefined
          ? { detalleAntes: this.toJson(payload.beforeData) }
          : {}),
        ...(payload.afterData !== undefined
          ? { detalleDespues: this.toJson(payload.afterData) }
          : {}),
        ...(payload.metadata !== undefined
          ? { metadata: this.toJson(payload.metadata) }
          : {}),
      },
    });
  }

  private toJson(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
