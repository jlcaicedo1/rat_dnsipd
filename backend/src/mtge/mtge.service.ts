import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MTGE_METHOD_VERSION,
  calculateMtgeResult,
  ensureActividadVersionEditable,
} from '../actividad-versiones/actividad-version.utils';
import { CalculateMtgeDto } from './dto/calculate-mtge.dto';

@Injectable()
export class MtgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findOne(actividadVersionId: number, actor: AuthenticatedUser) {
    await this.ensureVersionExists(actividadVersionId, actor);

    const data = await this.prisma.mtgeEvaluacion.findUnique({
      where: { actividadVersionId },
    });

    return { data };
  }

  async calculate(
    actividadVersionId: number,
    dto: CalculateMtgeDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAuthorTreatment(actor);
    const version = await this.ensureVersionExists(actividadVersionId, actor);
    ensureActividadVersionEditable(version.estadoVersion);

    const calculated = calculateMtgeResult(dto);
    const previous = await this.prisma.mtgeEvaluacion.findUnique({
      where: { actividadVersionId },
    });

    const data = await this.prisma.$transaction(async (tx) => {
      const mtge = await tx.mtgeEvaluacion.upsert({
        where: { actividadVersionId },
        create: {
          actividadVersionId,
          versionMetodologia: MTGE_METHOD_VERSION,
          volumenTitulares: dto.volumenTitulares,
          variedadCategorias: dto.variedadCategorias,
          duracionTratamiento: dto.duracionTratamiento,
          alcanceGeografico: dto.alcanceGeografico,
          observaciones: dto.observaciones?.trim() || null,
          puntajeTotal: calculated.puntajeTotal,
          esGranEscala: calculated.esGranEscala,
        },
        update: {
          versionMetodologia: MTGE_METHOD_VERSION,
          volumenTitulares: dto.volumenTitulares,
          variedadCategorias: dto.variedadCategorias,
          duracionTratamiento: dto.duracionTratamiento,
          alcanceGeografico: dto.alcanceGeografico,
          observaciones: dto.observaciones?.trim() || null,
          puntajeTotal: calculated.puntajeTotal,
          esGranEscala: calculated.esGranEscala,
        },
      });

      const hasHighRisk = await tx.riesgoEvaluacion.count({
        where: {
          actividadVersionId,
          OR: [{ nivelRiesgo: 'ALTO' }, { nivelRiesgo: 'CRITICO' }],
        },
      });

      await tx.actividadVersion.update({
        where: { id: actividadVersionId },
        data: {
          puntajeMtge: calculated.puntajeTotal,
          esGranEscala: calculated.esGranEscala,
          requiereEipd: calculated.esGranEscala || hasHighRisk > 0,
        },
      });

      await this.audit.log(tx, {
        modulo: 'mtge',
        entidad: 'MtgeEvaluacion',
        entidadId: actividadVersionId,
        accion: previous ? 'UPDATE' : 'CREATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Calculo de MTGE sobre version de actividad',
        beforeData: previous,
        afterData: mtge,
      });

      return mtge;
    });

    return { data };
  }

  async remove(actividadVersionId: number, actor?: AuthenticatedUser) {
    this.authz.assertCanAuthorTreatment(actor);
    const version = await this.ensureVersionExists(actividadVersionId, actor);
    ensureActividadVersionEditable(version.estadoVersion);

    const current = await this.prisma.mtgeEvaluacion.findUnique({
      where: { actividadVersionId },
    });

    if (!current) {
      throw new NotFoundException('MTGE no encontrado para la version de actividad');
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.mtgeEvaluacion.delete({
        where: { actividadVersionId },
      });

      const hasHighRisk = await tx.riesgoEvaluacion.count({
        where: {
          actividadVersionId,
          OR: [{ nivelRiesgo: 'ALTO' }, { nivelRiesgo: 'CRITICO' }],
        },
      });

      const hasEipd = await tx.eipd.count({
        where: { actividadVersionId },
      });

      await tx.actividadVersion.update({
        where: { id: actividadVersionId },
        data: {
          puntajeMtge: null,
          esGranEscala: false,
          requiereEipd: hasHighRisk > 0 || hasEipd > 0,
        },
      });

      await this.audit.log(tx, {
        modulo: 'mtge',
        entidad: 'MtgeEvaluacion',
        entidadId: actividadVersionId,
        accion: 'DELETE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Eliminacion de MTGE de version de actividad',
        beforeData: current,
        afterData: deleted,
      });

      return deleted;
    });

    return { data };
  }

  private async ensureVersionExists(id: number, actor?: AuthenticatedUser) {
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
}
