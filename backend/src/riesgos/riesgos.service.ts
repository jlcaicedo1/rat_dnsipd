import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';
import {
  calculateRiskLevel,
  ensureActividadVersionEditable,
} from '../actividad-versiones/actividad-version.utils';
import { CreateRiesgoDto } from './dto/create-riesgo.dto';
import { UpdateRiesgoDto } from './dto/update-riesgo.dto';

@Injectable()
export class RiesgosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async findByActividadVersion(actividadVersionId: number) {
    await this.ensureVersion(actividadVersionId);

    const data = await this.prisma.riesgoEvaluacion.findMany({
      where: { actividadVersionId },
      orderBy: [{ id: 'desc' }],
    });

    return { data };
  }

  async create(
    actividadVersionId: number,
    dto: CreateRiesgoDto,
    actor?: AuthenticatedUser,
  ) {
    const version = await this.ensureVersion(actividadVersionId);
    ensureActividadVersionEditable(version.estadoVersion);

    const nivelRiesgo = calculateRiskLevel(dto.probabilidad, dto.impacto);
    const nivelResidual =
      dto.probabilidadResidual !== undefined && dto.impactoResidual !== undefined
        ? calculateRiskLevel(dto.probabilidadResidual, dto.impactoResidual)
        : null;

    const data = await this.prisma.$transaction(async (tx) => {
      const riesgo = await tx.riesgoEvaluacion.create({
        data: {
          actividadVersionId,
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          probabilidad: dto.probabilidad,
          impacto: dto.impacto,
          nivelRiesgo,
          controlesExistentes: dto.controlesExistentes?.trim() || null,
          tratamiento: dto.tratamiento?.trim() || null,
          probabilidadResidual: dto.probabilidadResidual ?? null,
          impactoResidual: dto.impactoResidual ?? null,
          nivelResidual,
          estado: dto.estado?.trim() || 'IDENTIFICADO',
        },
      });

      await this.syncActividadVersionFlags(tx, actividadVersionId);

      await this.audit.log(tx, {
        modulo: 'riesgos',
        entidad: 'RiesgoEvaluacion',
        entidadId: riesgo.id,
        accion: 'CREATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Creacion de riesgo para version de actividad',
        afterData: riesgo,
        metadata: {
          actividadVersionId,
        },
      });

      return riesgo;
    });

    return { data };
  }

  async findOne(id: number) {
    const data = await this.prisma.riesgoEvaluacion.findUnique({
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
      throw new NotFoundException('Riesgo no encontrado');
    }

    return { data };
  }

  async update(id: number, dto: UpdateRiesgoDto, actor?: AuthenticatedUser) {
    const current = await this.findOne(id);
    ensureActividadVersionEditable(current.data.actividadVersion.estadoVersion);

    const probabilidad = dto.probabilidad ?? current.data.probabilidad;
    const impacto = dto.impacto ?? current.data.impacto;
    const probabilidadResidual =
      dto.probabilidadResidual !== undefined
        ? dto.probabilidadResidual
        : current.data.probabilidadResidual;
    const impactoResidual =
      dto.impactoResidual !== undefined
        ? dto.impactoResidual
        : current.data.impactoResidual;

    const nivelRiesgo = calculateRiskLevel(probabilidad, impacto);
    const nivelResidual =
      probabilidadResidual !== null &&
      probabilidadResidual !== undefined &&
      impactoResidual !== null &&
      impactoResidual !== undefined
        ? calculateRiskLevel(probabilidadResidual, impactoResidual)
        : null;

    const data = await this.prisma.$transaction(async (tx) => {
      const riesgo = await tx.riesgoEvaluacion.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre.trim() } : {}),
          ...(dto.descripcion !== undefined
            ? { descripcion: dto.descripcion?.trim() || null }
            : {}),
          ...(dto.probabilidad !== undefined
            ? { probabilidad: dto.probabilidad }
            : {}),
          ...(dto.impacto !== undefined ? { impacto: dto.impacto } : {}),
          nivelRiesgo,
          ...(dto.controlesExistentes !== undefined
            ? { controlesExistentes: dto.controlesExistentes?.trim() || null }
            : {}),
          ...(dto.tratamiento !== undefined
            ? { tratamiento: dto.tratamiento?.trim() || null }
            : {}),
          ...(dto.probabilidadResidual !== undefined
            ? { probabilidadResidual: dto.probabilidadResidual }
            : {}),
          ...(dto.impactoResidual !== undefined
            ? { impactoResidual: dto.impactoResidual }
            : {}),
          nivelResidual,
          ...(dto.estado !== undefined ? { estado: dto.estado.trim() } : {}),
        },
      });

      await this.syncActividadVersionFlags(tx, current.data.actividadVersionId);

      await this.audit.log(tx, {
        modulo: 'riesgos',
        entidad: 'RiesgoEvaluacion',
        entidadId: id,
        accion: 'UPDATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Actualizacion de riesgo',
        beforeData: current.data,
        afterData: riesgo,
      });

      return riesgo;
    });

    return { data };
  }

  async remove(id: number, actor?: AuthenticatedUser) {
    const current = await this.findOne(id);
    ensureActividadVersionEditable(current.data.actividadVersion.estadoVersion);

    const data = await this.prisma.$transaction(async (tx) => {
      const riesgo = await tx.riesgoEvaluacion.delete({
        where: { id },
      });

      await this.syncActividadVersionFlags(tx, current.data.actividadVersionId);

      await this.audit.log(tx, {
        modulo: 'riesgos',
        entidad: 'RiesgoEvaluacion',
        entidadId: id,
        accion: 'DELETE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Eliminacion de riesgo',
        beforeData: current.data,
        afterData: riesgo,
      });

      return riesgo;
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

  private async syncActividadVersionFlags(
    tx: Prisma.TransactionClient,
    actividadVersionId: number,
  ) {
    const mtge = await tx.mtgeEvaluacion.findUnique({
      where: { actividadVersionId },
    });

    const highRiskCount = await tx.riesgoEvaluacion.count({
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
        requiereEipd: (mtge?.esGranEscala ?? false) || highRiskCount > 0 || hasEipd > 0,
      },
    });
  }
}
