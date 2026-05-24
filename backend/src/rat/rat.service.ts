import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { AuthorizationScopeService } from "../auth/authorization-scope.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRatDto } from "./dto/create-rat.dto";
import { QueryRatDto } from "./dto/query-rat.dto";

@Injectable()
export class RatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(query: QueryRatDto, actor: AuthenticatedUser) {
    const where: Prisma.RatWhereInput = {
      AND: [this.authz.ratWhere(actor)],
      ...(query.dependenciaId ? { dependenciaId: query.dependenciaId } : {}),
      ...(query.subdireccionId ? { subdireccionId: query.subdireccionId } : {}),
      ...(query.estadoGeneral ? { estadoGeneral: query.estadoGeneral } : {}),
      ...(query.tipoProcesoId
        ? { dependencia: { tipoProcesoId: query.tipoProcesoId } }
        : {}),
      ...(query.search
        ? {
            OR: [
              { codigo: { contains: query.search, mode: "insensitive" } },
              { nombre: { contains: query.search, mode: "insensitive" } },
              { descripcion: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const rats = await this.prisma.rat.findMany({
      where,
      orderBy: [{ nombre: "asc" }],
      include: {
        dependencia: true,
        subdireccion: true,
        versiones: {
          orderBy: [{ id: "desc" }],
          take: 1,
        },
        _count: {
          select: {
            actividades: true,
          },
        },
      },
    });

    return {
      data: rats.map((rat) => ({
        id: rat.id,
        codigo: rat.codigo,
        nombre: rat.nombre,
        descripcion: rat.descripcion,
        estadoGeneral: rat.estadoGeneral,
        fechaProximaRevision: rat.fechaProximaRevision,
        dependencia: rat.dependencia,
        subdireccion: rat.subdireccion,
        versionActual: rat.versiones[0]?.numeroVersion ?? null,
        estadoVersionActual: rat.versiones[0]?.estadoVersion ?? null,
        totalActividades: rat._count.actividades,
      })),
    };
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const data = await this.prisma.rat.findFirst({
      where: {
        id,
        AND: [this.authz.ratWhere(actor)],
      },
      include: {
        dependencia: true,
        subdireccion: true,
        versiones: {
          orderBy: [{ id: "desc" }],
        },
        actividades: {
          orderBy: [{ nombre: "asc" }],
        },
      },
    });

    if (!data) {
      throw new NotFoundException("RAT no encontrado");
    }

    return { data };
  }

  async create(dto: CreateRatDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAuthorTreatment(actor);
    const dependenciaId = this.authz.resolveDependenciaIdForWrite(
      actor,
      dto.dependenciaId,
      { fallbackToActor: true },
    );

    if (!dependenciaId) {
      throw new UnprocessableEntityException(
        "Debe indicar una dependencia responsable para crear el RAT.",
      );
    }

    this.authz.assertCanUseSubdireccion(actor, dto.subdireccionId);
    const dependencia = await this.ensureDependencia(dependenciaId);
    await this.ensureSubdireccionBelongsToDependencia(
      dto.subdireccionId,
      dependenciaId,
    );
    assertRatCodeMatchesDependency(dto.codigo, dependencia.sigla);
    await this.ensureCodigoDisponible(dto.codigo);

    const data = await this.prisma.$transaction(async (tx) => {
      const rat = await tx.rat.create({
        data: {
          codigo: dto.codigo.trim().toUpperCase(),
          nombre: dto.nombre.trim(),
          descripcion: dto.descripcion?.trim() || null,
          dependenciaId,
          subdireccionId: dto.subdireccionId ?? null,
          fechaProximaRevision: dto.fechaProximaRevision
            ? new Date(dto.fechaProximaRevision)
            : null,
          estadoGeneral: "EN_CONSTRUCCION",
        },
      });

      const versionInicial = await tx.ratVersion.create({
        data: {
          ratId: rat.id,
          numeroVersion: "1.0",
          estadoVersion: "BORRADOR",
        },
      });

      await this.audit.log(tx, {
        modulo: "rats",
        entidad: "Rat",
        entidadId: rat.id,
        accion: "CREATE",
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: "Creacion de RAT con version inicial",
        afterData: {
          rat,
          versionInicial,
        },
      });

      return {
        ...rat,
        versionInicial,
      };
    });

    return { data };
  }

  private async ensureDependencia(id: number) {
    const dependencia = await this.prisma.orgDependencia.findFirst({
      where: { id, activo: true },
      select: { id: true, nombre: true, sigla: true },
    });

    if (!dependencia) {
      throw new NotFoundException("La dependencia indicada no existe o esta inactiva.");
    }

    return dependencia;
  }

  private async ensureSubdireccionBelongsToDependencia(
    subdireccionId: number | null | undefined,
    dependenciaId: number,
  ) {
    if (!subdireccionId) {
      return;
    }

    const subdireccion = await this.prisma.orgSubdireccion.findFirst({
      where: {
        id: subdireccionId,
        dependenciaId,
        activo: true,
      },
      select: { id: true },
    });

    if (!subdireccion) {
      throw new NotFoundException(
        "La dependencia ejecutora indicada no pertenece a la dependencia responsable.",
      );
    }
  }

  private async ensureCodigoDisponible(codigo: string) {
    const rat = await this.prisma.rat.findUnique({
      where: { codigo: codigo.trim().toUpperCase() },
      select: { id: true },
    });

    if (rat) {
      throw new ConflictException("Ya existe un RAT con ese codigo.");
    }
  }
}

function assertRatCodeMatchesDependency(
  codigo: string,
  dependenciaSigla?: string | null,
) {
  const sigla = normalizeCodeToken(dependenciaSigla);

  if (!sigla) {
    throw new UnprocessableEntityException(
      "La dependencia responsable no tiene sigla para generar el codigo RAT.",
    );
  }

  const expectedPrefix = `RAT-${sigla}`;

  if (!normalizeCodeToken(codigo).startsWith(expectedPrefix)) {
    throw new UnprocessableEntityException(
      `El codigo RAT debe iniciar con ${expectedPrefix} para la dependencia asignada.`,
    );
  }
}

function normalizeCodeToken(value?: string | null) {
  return (value ?? "").trim().toUpperCase();
}
