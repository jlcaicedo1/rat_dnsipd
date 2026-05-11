import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateActividadVersionDto } from './dto/create-actividad-version.dto';
import { TransitionCommentDto } from './dto/transition-comment.dto';
import { UpdateActividadVersionDto } from './dto/update-actividad-version.dto';

@Injectable()
export class ActividadVersionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async create(
    actividadId: number,
    dto: CreateActividadVersionDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAuthorTreatment(actor);
    const actividad = await this.ensureActividad(actividadId, actor);

    const lastVersion = await this.prisma.actividadVersion.findFirst({
      where: { actividadId },
      orderBy: [{ id: 'desc' }],
    });

    const numeroVersion = this.nextVersionNumber(lastVersion?.numeroVersion);

    const data = await this.prisma.actividadVersion.create({
      data: {
        actividadId,
        numeroVersion,
        estadoVersion: 'BORRADOR',
        finalidad: lastVersion?.finalidad ?? null,
        baseLicitudId: lastVersion?.baseLicitudId ?? null,
        observacionLicitud: lastVersion?.observacionLicitud ?? null,
        plazoConservacion: lastVersion?.plazoConservacion ?? null,
        fechaProximaRevision: lastVersion?.fechaProximaRevision ?? null,
        motivoActualizacion:
          dto.motivoActualizacion?.trim() || 'Nueva version de actividad',
        requiereEipd: false,
        esGranEscala: false,
        puntajeMtge: null,
      },
      include: {
        actividad: true,
      },
    });

    await this.audit.log(this.prisma, {
      modulo: 'actividad-versiones',
      entidad: 'ActividadVersion',
      entidadId: data.id,
      accion: 'CREATE',
      actor: actor?.username,
      actorRole: actor?.role,
      descripcion: 'Creacion de nueva version de actividad',
      afterData: data,
      metadata: {
        actividadId,
      },
    });

    return {
      data: {
        ...data,
        actividad,
      },
    };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const data = await this.prisma.actividadVersion.findFirst({
      where: {
        id,
        actividad: this.authz.actividadWhere(actor),
      },
      include: {
        actividad: true,
        baseLicitud: true,
      },
    });

    if (!data) {
      throw new NotFoundException('Version de actividad no encontrada');
    }

    return { data };
  }

  async findFull(id: number, actor: AuthenticatedUser) {
    const data = await this.prisma.actividadVersion.findFirst({
      where: {
        id,
        actividad: this.authz.actividadWhere(actor),
      },
      include: {
        actividad: {
          include: {
            rat: {
              include: {
                dependencia: true,
                subdireccion: true,
              },
            },
          },
        },
        baseLicitud: true,
        activos: {
          include: {
            activo: true,
          },
        },
        mtgeEvaluacion: true,
        riesgos: true,
        eipd: true,
        observacionesRevision: {
          orderBy: [{ id: 'desc' }],
        },
      },
    });

    if (!data) {
      throw new NotFoundException('Version de actividad no encontrada');
    }

    return { data };
  }

  async findObservaciones(id: number, actor: AuthenticatedUser) {
    await this.ensureVersion(id, actor);

    const data = await this.prisma.revisionObservacion.findMany({
      where: { actividadVersionId: id },
      orderBy: [{ id: 'desc' }],
    });

    return { data };
  }

  async update(
    id: number,
    dto: UpdateActividadVersionDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAuthorTreatment(actor);
    const version = await this.ensureVersion(id, actor);

    if (version.estadoVersion === 'VIGENTE') {
      throw new ConflictException('No se puede editar una version vigente');
    }

    if (dto.baseLicitudId !== undefined && dto.baseLicitudId !== null) {
      await this.ensureCatalogo(dto.baseLicitudId);
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.actividadVersion.update({
        where: { id },
        data: {
          ...(dto.finalidad !== undefined ? { finalidad: dto.finalidad.trim() } : {}),
          ...(dto.baseLicitudId !== undefined
            ? { baseLicitudId: dto.baseLicitudId }
            : {}),
          ...(dto.observacionLicitud !== undefined
            ? {
                observacionLicitud: dto.observacionLicitud?.trim() || null,
              }
            : {}),
          ...(dto.plazoConservacion !== undefined
            ? { plazoConservacion: dto.plazoConservacion?.trim() || null }
            : {}),
          ...(dto.fechaProximaRevision !== undefined
            ? {
                fechaProximaRevision: dto.fechaProximaRevision
                  ? new Date(dto.fechaProximaRevision)
                  : null,
              }
            : {}),
          ...(dto.motivoActualizacion !== undefined
            ? {
                motivoActualizacion: dto.motivoActualizacion?.trim() || null,
              }
            : {}),
          ...(dto.requiereEipd !== undefined
            ? { requiereEipd: dto.requiereEipd }
            : {}),
          ...(dto.esGranEscala !== undefined
            ? { esGranEscala: dto.esGranEscala }
            : {}),
          ...(dto.puntajeMtge !== undefined ? { puntajeMtge: dto.puntajeMtge } : {}),
        },
        include: {
          actividad: true,
          baseLicitud: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividad-versiones',
        entidad: 'ActividadVersion',
        entidadId: id,
        accion: 'UPDATE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Actualizacion de version de actividad',
        beforeData: version,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async submitReview(id: number, actor?: AuthenticatedUser) {
    this.authz.assertCanAuthorTreatment(actor);
    const version = await this.ensureVersion(id, actor);
    this.ensureEditableWorkflow(version.estadoVersion, ['BORRADOR', 'SUBSANADA']);
    this.ensureReviewCompleteness(version);

    const mtge = await this.prisma.mtgeEvaluacion.findUnique({
      where: { actividadVersionId: id },
    });

    if (!mtge) {
      throw new UnprocessableEntityException(
        'Debe calcular el MTGE antes de enviar a revision',
      );
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.actividadVersion.update({
        where: { id },
        data: {
          estadoVersion: 'EN_REVISION',
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividad-versiones',
        entidad: 'ActividadVersion',
        entidadId: id,
        accion: 'SUBMIT_REVIEW',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Envio de version a revision',
        beforeData: version,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async observe(
    id: number,
    dto: TransitionCommentDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanApproveTreatment(actor);
    const version = await this.ensureVersion(id, actor);
    this.ensureEditableWorkflow(version.estadoVersion, ['EN_REVISION']);
    const comentario = this.normalizeComment(dto.comentario);

    const data = await this.prisma.$transaction(async (tx) => {
      await tx.revisionObservacion.create({
        data: {
          actividadVersionId: id,
          comentario,
          campo: dto.campo?.trim() || null,
          autor: actor?.username || dto.autor?.trim() || 'revisor',
          atendida: false,
        },
      });

      return tx.actividadVersion.update({
        where: { id },
        data: {
          estadoVersion: 'OBSERVADA',
        },
      });
    });

    await this.audit.log(this.prisma, {
      modulo: 'actividad-versiones',
      entidad: 'ActividadVersion',
      entidadId: id,
      accion: 'OBSERVE',
      actor: actor?.username || dto.autor?.trim() || 'revisor',
      actorRole: actor?.role,
      descripcion: 'Observacion de version en revision',
      beforeData: version,
      afterData: data,
      metadata: {
        comentario,
        campo: dto.campo?.trim() || null,
      },
    });

    return {
      data: {
        ...data,
        observacion: comentario,
      },
    };
  }

  async subsanar(
    id: number,
    dto: TransitionCommentDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAuthorTreatment(actor);
    const version = await this.ensureVersion(id, actor);
    this.ensureEditableWorkflow(version.estadoVersion, ['OBSERVADA']);
    const comentario = this.normalizeComment(dto.comentario);

    const observacionPendiente =
      await this.prisma.revisionObservacion.findFirst({
        where: {
          actividadVersionId: id,
          atendida: false,
        },
        orderBy: [{ id: 'desc' }],
      });

    if (!observacionPendiente) {
      throw new UnprocessableEntityException(
        'No existe una observacion pendiente por subsanar',
      );
    }

    const data = await this.prisma.$transaction(async (tx) => {
      await tx.revisionObservacion.update({
        where: { id: observacionPendiente.id },
        data: {
          atendida: true,
          comentarioSubsanacion: comentario,
          fechaSubsanacion: new Date(),
          subsanadoPor: actor?.username || dto.autor?.trim() || 'editor',
        },
      });

      return tx.actividadVersion.update({
        where: { id },
        data: {
          estadoVersion: 'SUBSANADA',
        },
      });
    });

    await this.audit.log(this.prisma, {
      modulo: 'actividad-versiones',
      entidad: 'ActividadVersion',
      entidadId: id,
      accion: 'SUBSANAR',
      actor: actor?.username || dto.autor?.trim() || 'editor',
      actorRole: actor?.role,
      descripcion: 'Subsanacion de observacion de version',
      beforeData: version,
      afterData: data,
      metadata: {
        comentario,
        observacionAtendidaId: observacionPendiente.id,
      },
    });

    return {
      data: {
        ...data,
        comentario: comentario,
        observacionAtendidaId: observacionPendiente.id,
      },
    };
  }

  async approve(id: number, actor?: AuthenticatedUser) {
    this.authz.assertCanApproveTreatment(actor);
    const version = await this.ensureVersion(id, actor);
    this.ensureEditableWorkflow(version.estadoVersion, ['EN_REVISION']);

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.actividadVersion.update({
        where: { id },
        data: {
          estadoVersion: 'APROBADA',
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividad-versiones',
        entidad: 'ActividadVersion',
        entidadId: id,
        accion: 'APPROVE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Aprobacion de version de actividad',
        beforeData: version,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  async setCurrent(id: number, actor?: AuthenticatedUser) {
    this.authz.assertCanApproveTreatment(actor);
    const version = await this.ensureVersion(id, actor);
    this.ensureEditableWorkflow(version.estadoVersion, ['APROBADA']);

    const data = await this.prisma.$transaction(async (tx) => {
      const previousCurrent = await tx.actividadVersion.findMany({
        where: {
          actividadId: version.actividadId,
          estadoVersion: 'VIGENTE',
        },
      });

      await tx.actividadVersion.updateMany({
        where: {
          actividadId: version.actividadId,
          estadoVersion: 'VIGENTE',
        },
        data: {
          estadoVersion: 'REEMPLAZADA',
        },
      });

      const updated = await tx.actividadVersion.update({
        where: { id },
        data: {
          estadoVersion: 'VIGENTE',
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividad-versiones',
        entidad: 'ActividadVersion',
        entidadId: id,
        accion: 'SET_CURRENT',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Publicacion de version vigente',
        beforeData: version,
        afterData: updated,
        metadata: {
          previousCurrent,
        },
      });

      return updated;
    });

    return { data };
  }

  async archive(id: number, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerWorkflow(actor);
    const version = await this.ensureVersion(id, actor);
    this.ensureEditableWorkflow(version.estadoVersion, [
      'BORRADOR',
      'OBSERVADA',
      'SUBSANADA',
      'APROBADA',
      'VIGENTE',
      'REEMPLAZADA',
    ]);

    const data = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.actividadVersion.update({
        where: { id },
        data: {
          estadoVersion: 'ARCHIVADA',
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividad-versiones',
        entidad: 'ActividadVersion',
        entidadId: id,
        accion: 'ARCHIVE',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Archivo de version de actividad',
        beforeData: version,
        afterData: updated,
      });

      return updated;
    });

    return { data };
  }

  private async ensureActividad(id: number, actor?: AuthenticatedUser) {
    const actividad = await this.prisma.actividadTratamiento.findFirst({
      where: {
        id,
        ...(actor ? { AND: [this.authz.actividadWhere(actor)] } : {}),
      },
    });

    if (!actividad) {
      throw new NotFoundException('Actividad no encontrada');
    }

    return actividad;
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

  private async ensureCatalogo(id: number) {
    const catalogo = await this.prisma.catalogo.findUnique({
      where: { id },
    });

    if (!catalogo) {
      throw new UnprocessableEntityException('Catalogo no existe');
    }

    return catalogo;
  }

  private ensureEditableWorkflow(current: string, allowed: string[]) {
    if (!allowed.includes(current)) {
      throw new ConflictException(
        `La transicion no es valida desde el estado ${current}`,
      );
    }
  }

  private ensureReviewCompleteness(version: {
    finalidad: string | null;
    baseLicitudId: number | null;
    plazoConservacion: string | null;
  }) {
    if (!version.finalidad?.trim()) {
      throw new UnprocessableEntityException(
        'Debe completar la finalidad antes de enviar a revision',
      );
    }

    if (!version.baseLicitudId) {
      throw new UnprocessableEntityException(
        'Debe completar la base de licitud antes de enviar a revision',
      );
    }

    if (!version.plazoConservacion?.trim()) {
      throw new UnprocessableEntityException(
        'Debe completar el plazo de conservacion antes de enviar a revision',
      );
    }
  }

  private nextVersionNumber(current?: string | null) {
    if (!current) {
      return '1.0';
    }

    const [majorRaw, minorRaw] = current.split('.');
    const major = Number(majorRaw || 1);
    const minor = Number(minorRaw || 0);

    return `${major}.${minor + 1}`;
  }

  private normalizeComment(comment: string) {
    const normalized = comment.trim();

    if (!normalized) {
      throw new UnprocessableEntityException(
        'El comentario no puede estar vacio',
      );
    }

    return normalized;
  }
}
