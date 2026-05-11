import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { AuthorizationScopeService } from "../auth/authorization-scope.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCatalogoDto } from "./dto/create-catalogo.dto";
import { QueryCatalogoDto } from "./dto/query-catalogo.dto";
import { UpdateCatalogoDto } from "./dto/update-catalogo.dto";

@Injectable()
export class CatalogosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(query: QueryCatalogoDto) {
    const where: Prisma.CatalogoWhereInput = {};

    if (query.dominio?.trim()) {
      where.dominio = normalizeCatalogKey(query.dominio);
    }

    if (query.tipo?.trim()) {
      where.tipo = normalizeCatalogKey(query.tipo);
    }

    if (typeof query.activo === "boolean") {
      where.activo = query.activo;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { codigo: { contains: search, mode: "insensitive" } },
        { nombre: { contains: search, mode: "insensitive" } },
        { descripcion: { contains: search, mode: "insensitive" } },
      ];
    }

    const data = await this.prisma.catalogo.findMany({
      where,
      orderBy: [{ tipo: "asc" }, { nombre: "asc" }],
    });

    return {
      data,
      filters: {
        dominio: where.dominio ?? null,
        tipo: where.tipo ?? null,
        activo: typeof query.activo === "boolean" ? query.activo : null,
        search: query.search?.trim() || null,
      },
    };
  }

  async create(dto: CreateCatalogoDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerCatalogs(actor);
    const data = normalizeCatalogPayload(dto);
    const existing = await this.prisma.catalogo.findUnique({
      where: {
        tipo_codigo: {
          tipo: data.tipo,
          codigo: data.codigo,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        "Ya existe un item maestro con el mismo tipo y codigo.",
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const catalogo = await tx.catalogo.create({ data });

      await this.audit.log(tx, {
        modulo: "catalogos",
        entidad: "Catalogo",
        entidadId: catalogo.id,
        accion: "CREATE",
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: "Creacion de item maestro de catalogo",
        afterData: catalogo,
      });

      return catalogo;
    });

    return { data: created };
  }

  async update(id: number, dto: UpdateCatalogoDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerCatalogs(actor);
    const current = await this.prisma.catalogo.findUnique({ where: { id } });

    if (!current) {
      throw new NotFoundException("No se encontro el item maestro solicitado.");
    }

    const data = normalizeCatalogPayload({
      dominio: dto.dominio ?? current.dominio,
      tipo: dto.tipo ?? current.tipo,
      codigo: dto.codigo ?? current.codigo,
      nombre: dto.nombre ?? current.nombre,
      descripcion:
        dto.descripcion !== undefined ? dto.descripcion : current.descripcion ?? "",
      activo: dto.activo ?? current.activo,
    });

    const duplicate = await this.prisma.catalogo.findFirst({
      where: {
        id: { not: id },
        tipo: data.tipo,
        codigo: data.codigo,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        "Ya existe otro item maestro con el mismo tipo y codigo.",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const catalogo = await tx.catalogo.update({
        where: { id },
        data,
      });

      await this.audit.log(tx, {
        modulo: "catalogos",
        entidad: "Catalogo",
        entidadId: id,
        accion: "UPDATE",
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: "Actualizacion de item maestro de catalogo",
        beforeData: current,
        afterData: catalogo,
      });

      return catalogo;
    });

    return { data: updated };
  }
}

function normalizeCatalogPayload(
  payload: Pick<
    CreateCatalogoDto,
    "dominio" | "tipo" | "codigo" | "nombre" | "descripcion" | "activo"
  >,
) {
  return {
    dominio: normalizeCatalogKey(payload.dominio ?? "GENERAL"),
    tipo: normalizeCatalogKey(payload.tipo),
    codigo: normalizeCatalogKey(payload.codigo),
    nombre: payload.nombre.trim(),
    descripcion: payload.descripcion?.trim() || null,
    activo: payload.activo ?? true,
  };
}

function normalizeCatalogKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase()
    .trim();
}
