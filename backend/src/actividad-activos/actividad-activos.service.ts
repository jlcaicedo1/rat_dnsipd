import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AuthorizationScopeService } from '../auth/authorization-scope.service';
import { PrismaService } from '../prisma/prisma.service';
import { LinkActivoDto } from './dto/link-activo.dto';

@Injectable()
export class ActividadActivosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(actividadVersionId: number, actor: AuthenticatedUser) {
    await this.ensureVersion(actividadVersionId, actor);

    const data = await this.prisma.actividadActivo.findMany({
      where: {
        actividadVersionId,
        activo: this.authz.activoWhere(actor),
      },
      include: {
        activo: true,
      },
      orderBy: [{ id: 'desc' }],
    });

    return { data };
  }

  async create(
    actividadVersionId: number,
    dto: LinkActivoDto,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAuthorTreatment(actor);
    const version = await this.ensureVersion(actividadVersionId, actor);
    this.ensureVersionEditable(version.estadoVersion);
    const activo = await this.ensureActivo(dto.activoId, actor);
    this.assertSameDependencia(version.actividad.rat.dependenciaId, activo.dependenciaId);

    const exists = await this.prisma.actividadActivo.findUnique({
      where: {
        actividadVersionId_activoId: {
          actividadVersionId,
          activoId: dto.activoId,
        },
      },
    });

    if (exists) {
      throw new ConflictException(
        'El activo ya esta asociado a la version de actividad',
      );
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const linked = await tx.actividadActivo.create({
        data: {
          actividadVersionId,
          activoId: dto.activoId,
        },
        include: {
          activo: true,
          actividadVersion: true,
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividad-activos',
        entidad: 'ActividadActivo',
        entidadId: linked.id,
        accion: 'LINK',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Asociacion de activo a version de actividad',
        afterData: linked,
      });

      return linked;
    });

    return { data };
  }

  async remove(
    actividadVersionId: number,
    activoId: number,
    actor?: AuthenticatedUser,
  ) {
    this.authz.assertCanAuthorTreatment(actor);
    const version = await this.ensureVersion(actividadVersionId, actor);
    this.ensureVersionEditable(version.estadoVersion);

    const relation = await this.prisma.actividadActivo.findUnique({
      where: {
        actividadVersionId_activoId: {
          actividadVersionId,
          activoId,
        },
      },
      include: {
        activo: true,
      },
    });

    if (!relation) {
      throw new NotFoundException(
        'La asociacion entre version de actividad y activo no existe',
      );
    }

    if (actor) {
      this.authz.assertCanUseDependencia(actor, relation.activo.dependenciaId);
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.actividadActivo.delete({
        where: {
          actividadVersionId_activoId: {
            actividadVersionId,
            activoId,
          },
        },
      });

      await this.audit.log(tx, {
        modulo: 'actividad-activos',
        entidad: 'ActividadActivo',
        entidadId: relation.id,
        accion: 'UNLINK',
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: 'Desasociacion de activo de version de actividad',
        beforeData: relation,
        afterData: deleted,
      });

      return deleted;
    });

    return {
      data: {
        ...data,
        activo: relation.activo,
      },
    };
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
      include: {
        actividad: {
          include: {
            rat: true,
          },
        },
      },
    });

    if (!version) {
      throw new NotFoundException('Version de actividad no encontrada');
    }

    return version;
  }

  private async ensureActivo(id: number, actor?: AuthenticatedUser) {
    const activo = await this.prisma.activoInformacion.findFirst({
      where: {
        id,
        ...(actor ? { AND: [this.authz.activoWhere(actor)] } : {}),
      },
    });

    if (!activo) {
      throw new NotFoundException('Activo de informacion no encontrado');
    }

    return activo;
  }

  private ensureVersionEditable(estadoVersion: string) {
    if (!['BORRADOR', 'OBSERVADA', 'SUBSANADA'].includes(estadoVersion)) {
      throw new ConflictException(
        `No se pueden editar activos desde el estado ${estadoVersion}`,
      );
    }
  }

  private assertSameDependencia(
    actividadDependenciaId: number,
    activoDependenciaId: number | null,
  ) {
    if (!activoDependenciaId || activoDependenciaId !== actividadDependenciaId) {
      throw new ConflictException(
        'El activo debe pertenecer a la misma dependencia de la actividad de tratamiento.',
      );
    }
  }
}
