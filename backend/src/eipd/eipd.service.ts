import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import { ensureActividadVersionEditable } from '../actividad-versiones/actividad-version.utils';
import { CreateEipdDto } from './dto/create-eipd.dto';
import { UpdateEipdDto } from './dto/update-eipd.dto';

@Injectable()
export class EipdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByActividadVersion(actividadVersionId: number) {
    await this.ensureVersion(actividadVersionId);

    const data = await this.prisma.eipd.findUnique({
      where: { actividadVersionId },
    });

    return { data };
  }

  async create(
    actividadVersionId: number,
    dto: CreateEipdDto,
    actor?: AuthenticatedUser,
  ) {
    const version = await this.ensureVersion(actividadVersionId);
    ensureActividadVersionEditable(version.estadoVersion);

    const existing = await this.prisma.eipd.findUnique({
      where: { actividadVersionId },
    });

    if (existing) {
      throw new ConflictException('Ya existe una EIPD asociada a esta version');
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const eipd = await tx.eipd.create({
        data: {
          actividadVersionId,
          codigo: dto.codigo?.trim() || `EIPD-AV-${actividadVersionId}`,
          estado: dto.estado?.trim() || 'PRE_EVALUACION',
          resumen: dto.resumen?.trim() || null,
          conclusion: dto.conclusion?.trim() || null,
          medidasMitigacion: dto.medidasMitigacion?.trim() || null,
          requiereConsultaPrevia: dto.requiereConsultaPrevia ?? false,
          fechaEvaluacion: dto.fechaEvaluacion
            ? new Date(dto.fechaEvaluacion)
            : null,
        },
      });

      await tx.actividadVersion.update({
        where: { id: actividadVersionId },
        data: { requiereEipd: true },
      });

      await this.audit.log(tx, {
        modulo: 'eipd',
        entidad: 'Eipd',
        entidadId: eipd.id,
        accion: 'CREATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Creacion de EIPD asociada a version de actividad',
        afterData: eipd,
        metadata: {
          actividadVersionId,
        },
      });

      return eipd;
    });

    return { data };
  }

  async findOne(id: number) {
    const data = await this.prisma.eipd.findUnique({
      where: { id },
      include: {
        actividadVersion: {
          include: {
            actividad: true,
          },
        },
      },
    });

    if (!data) {
      throw new NotFoundException('EIPD no encontrada');
    }

    return { data };
  }

  async update(id: number, dto: UpdateEipdDto, actor?: AuthenticatedUser) {
    const current = await this.findOne(id);
    ensureActividadVersionEditable(current.data.actividadVersion.estadoVersion);

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.eipd.update({
        where: { id },
        data: {
          ...(dto.codigo !== undefined ? { codigo: dto.codigo.trim() } : {}),
          ...(dto.estado !== undefined ? { estado: dto.estado.trim() } : {}),
          ...(dto.resumen !== undefined ? { resumen: dto.resumen?.trim() || null } : {}),
          ...(dto.conclusion !== undefined
            ? { conclusion: dto.conclusion?.trim() || null }
            : {}),
          ...(dto.medidasMitigacion !== undefined
            ? { medidasMitigacion: dto.medidasMitigacion?.trim() || null }
            : {}),
          ...(dto.requiereConsultaPrevia !== undefined
            ? { requiereConsultaPrevia: dto.requiereConsultaPrevia }
            : {}),
          ...(dto.fechaEvaluacion !== undefined
            ? {
                fechaEvaluacion: dto.fechaEvaluacion
                  ? new Date(dto.fechaEvaluacion)
                  : null,
              }
            : {}),
        },
      });

      await this.audit.log(tx, {
        modulo: 'eipd',
        entidad: 'Eipd',
        entidadId: id,
        accion: 'UPDATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Actualizacion de EIPD',
        beforeData: current.data,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async remove(id: number, actor?: AuthenticatedUser) {
    const current = await this.findOne(id);
    ensureActividadVersionEditable(current.data.actividadVersion.estadoVersion);

    const data = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.eipd.delete({
        where: { id },
      });

      const mtge = await tx.mtgeEvaluacion.findUnique({
        where: { actividadVersionId: current.data.actividadVersionId },
      });

      const highRiskCount = await tx.riesgoEvaluacion.count({
        where: {
          actividadVersionId: current.data.actividadVersionId,
          OR: [{ nivelRiesgo: 'ALTO' }, { nivelRiesgo: 'CRITICO' }],
        },
      });

      await tx.actividadVersion.update({
        where: { id: current.data.actividadVersionId },
        data: {
          requiereEipd: (mtge?.esGranEscala ?? false) || highRiskCount > 0,
        },
      });

      await this.audit.log(tx, {
        modulo: 'eipd',
        entidad: 'Eipd',
        entidadId: id,
        accion: 'DELETE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Eliminacion de EIPD',
        beforeData: current.data,
        afterData: deleted,
      });

      return deleted;
    });

    return { data };
  }

  private async ensureVersion(id: number) {
    const version = await this.prisma.actividadVersion.findUnique({
      where: { id },
    });

    if (!version) {
      throw new NotFoundException('Version de actividad no encontrada');
    }

    return version;
  }
}
