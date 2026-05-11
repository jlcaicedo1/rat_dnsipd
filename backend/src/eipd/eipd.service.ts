import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { ensureActividadVersionEditable } from '../actividad-versiones/actividad-version.utils';
import { CreateEipdDto } from './dto/create-eipd.dto';
import { UpdateEipdDto } from './dto/update-eipd.dto';

const EIPD_APPROVAL_STATES = new Set([
  'APROBADA',
  'APROBADO',
  'DICTAMEN_APROBADO',
  'CONSULTA_PREVIA_APROBADA',
  'RECHAZADA',
  'DEVUELTA',
  'OBSERVADA',
]);

@Injectable()
export class EipdService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findByActividadVersion(
    actividadVersionId: number,
    actor: AuthenticatedUser,
  ) {
    await this.ensureVersion(actividadVersionId, actor);

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
    this.assertEipdTransitionRole(dto.estado, actor);
    const version = await this.ensureVersion(actividadVersionId, actor);
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

  async findOne(id: number, actor: AuthenticatedUser) {
    const data = await this.prisma.eipd.findFirst({
      where: {
        id,
        actividadVersion: {
          actividad: this.authz.actividadWhere(actor),
        },
      },
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
    this.assertEipdTransitionRole(dto.estado, actor);
    const current = await this.findOne(id, actor as AuthenticatedUser);
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
    this.authz.assertCanUpdateAssessments(actor);
    const current = await this.findOne(id, actor as AuthenticatedUser);
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

  private async ensureVersion(id: number, actor?: AuthenticatedUser) {
    const version = await this.prisma.actividadVersion.findFirst({
      where: {
        id,
        ...(actor
          ? {
              actividad: this.authz.actividadWhere(actor),
            }
          : {}),
      },
    });

    if (!version) {
      throw new NotFoundException('Version de actividad no encontrada');
    }

    return version;
  }

  private assertEipdTransitionRole(
    estado: string | undefined,
    actor: AuthenticatedUser | undefined,
  ) {
    const normalized = estado?.trim().toUpperCase();

    if (normalized && EIPD_APPROVAL_STATES.has(normalized)) {
      this.authz.assertCanApproveTreatment(actor);
      return;
    }

    this.authz.assertCanUpdateAssessments(actor);
  }
}
