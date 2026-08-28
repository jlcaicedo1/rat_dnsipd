import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { AuthenticatedUser } from "../auth/authenticated-user.interface";
import { AuthorizationScopeService } from "../auth/authorization-scope.service";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCatalogoDto } from "./dto/create-catalogo.dto";
import { QueryCatalogoDto } from "./dto/query-catalogo.dto";
import { UpdateCatalogoDto } from "./dto/update-catalogo.dto";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CatalogNode = {
  id: number;
  dominio: string;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  parentId: number | null;
  orden: number;
  children: CatalogNode[];
};

export type CatalogTreeTipo = {
  tipo: string;
  items: CatalogNode[];
};

export type CatalogTreeDominio = {
  dominio: string;
  tipos: CatalogTreeTipo[];
};

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CatalogosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly authz: AuthorizationScopeService,
  ) {}

  async findAll(query: QueryCatalogoDto) {
    const where: {
      dominio?: string;
      tipo?: string;
      activo?: boolean;
      OR?: { codigo?: { contains: string; mode: "insensitive" }; nombre?: { contains: string; mode: "insensitive" }; descripcion?: { contains: string; mode: "insensitive" } }[];
    } = {};

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
      orderBy: [{ orden: "asc" }, { tipo: "asc" }, { nombre: "asc" }],
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

  async findTree(query: QueryCatalogoDto): Promise<{ data: CatalogTreeDominio[] }> {
    const where: { dominio?: string; activo?: boolean } = {};

    if (query.dominio?.trim()) {
      where.dominio = normalizeCatalogKey(query.dominio);
    }

    if (typeof query.activo === "boolean") {
      where.activo = query.activo;
    }

    const items = await this.prisma.catalogo.findMany({
      where,
      orderBy: [{ orden: "asc" }, { tipo: "asc" }, { nombre: "asc" }],
    });

    // Build id→node map
    const nodeMap = new Map<number, CatalogNode>();
    for (const item of items) {
      nodeMap.set(item.id, { ...item, children: [] });
    }

    // Attach children to parents (within the fetched set)
    const roots: CatalogNode[] = [];
    for (const node of nodeMap.values()) {
      if (node.parentId !== null && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    // Group root nodes by dominio → tipo
    const dominioMap = new Map<string, Map<string, CatalogNode[]>>();
    for (const node of roots) {
      if (!dominioMap.has(node.dominio)) {
        dominioMap.set(node.dominio, new Map());
      }
      const tipoMap = dominioMap.get(node.dominio)!;
      if (!tipoMap.has(node.tipo)) {
        tipoMap.set(node.tipo, []);
      }
      tipoMap.get(node.tipo)!.push(node);
    }

    const tree: CatalogTreeDominio[] = Array.from(dominioMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dominio, tipoMap]) => ({
        dominio,
        tipos: Array.from(tipoMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([tipo, items]) => ({ tipo, items })),
      }));

    return { data: tree };
  }

  async create(dto: CreateCatalogoDto, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerCatalogs(actor);

    const data = normalizeCatalogPayload(dto);
    const parentId = dto.parentId ?? null;

    // Validate parent exists if provided
    if (parentId !== null) {
      const parent = await this.prisma.catalogo.findUnique({ where: { id: parentId } });
      if (!parent) {
        throw new NotFoundException("El catalogo padre indicado no existe.");
      }
    }

    // Check uniqueness within the same parent scope
    const existing = await this.prisma.catalogo.findFirst({
      where: { tipo: data.tipo, codigo: data.codigo, parentId },
    });

    if (existing) {
      throw new ConflictException(
        "Ya existe un item de catalogo con el mismo tipo y codigo en este nivel.",
      );
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const catalogo = await tx.catalogo.create({
        data: { ...data, parentId, orden: dto.orden ?? 0 },
      });

      await this.audit.log(tx, {
        modulo: "catalogos",
        entidad: "Catalogo",
        entidadId: catalogo.id,
        accion: "CREATE",
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: "Creacion de item de catalogo",
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
      throw new NotFoundException("No se encontro el item de catalogo solicitado.");
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

    const parentId =
      dto.parentId !== undefined ? dto.parentId : current.parentId;

    // Check uniqueness (exclude self, within same parent scope)
    const duplicate = await this.prisma.catalogo.findFirst({
      where: {
        id: { not: id },
        tipo: data.tipo,
        codigo: data.codigo,
        parentId,
      },
    });

    if (duplicate) {
      throw new ConflictException(
        "Ya existe otro item de catalogo con el mismo tipo y codigo en este nivel.",
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const catalogo = await tx.catalogo.update({
        where: { id },
        data: {
          ...data,
          parentId,
          orden: dto.orden !== undefined ? dto.orden : current.orden,
        },
      });

      await this.audit.log(tx, {
        modulo: "catalogos",
        entidad: "Catalogo",
        entidadId: id,
        accion: "UPDATE",
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: "Actualizacion de item de catalogo",
        beforeData: current,
        afterData: catalogo,
      });

      return catalogo;
    });

    return { data: updated };
  }

  async delete(id: number, actor?: AuthenticatedUser) {
    this.authz.assertCanAdministerCatalogs(actor);

    const current = await this.prisma.catalogo.findUnique({
      where: { id },
      include: { children: { select: { id: true } } },
    });

    if (!current) {
      throw new NotFoundException("No se encontro el item de catalogo solicitado.");
    }

    // Check for external references (FK from other tables)
    const refCount = await this.countExternalReferences(id);
    const hasChildren = current.children.length > 0;

    if (refCount > 0) {
      // Soft delete — cannot remove due to referential integrity
      const updated = await this.prisma.$transaction(async (tx) => {
        const catalogo = await tx.catalogo.update({
          where: { id },
          data: { activo: false },
        });

        await this.audit.log(tx, {
          modulo: "catalogos",
          entidad: "Catalogo",
          entidadId: id,
          accion: "DEACTIVATE",
          actor: actor?.username,
          actorRole: actor?.role,
          descripcion: `Desactivacion logica: ${refCount} dependencia(s) activa(s) impiden eliminacion fisica`,
          beforeData: current,
          afterData: catalogo,
        });

        return catalogo;
      });

      return {
        data: updated,
        mode: "soft",
        reason: `El item tiene ${refCount} referencia(s) activa(s). Se desactivo logicamente para preservar integridad referencial.`,
      };
    }

    if (hasChildren) {
      throw new BadRequestException(
        "El item tiene sub-items. Elimine o reubique los sub-items antes de eliminar el padre.",
      );
    }

    // Hard delete
    await this.prisma.$transaction(async (tx) => {
      await tx.catalogo.delete({ where: { id } });

      await this.audit.log(tx, {
        modulo: "catalogos",
        entidad: "Catalogo",
        entidadId: id,
        accion: "DELETE",
        actor: actor?.username,
        actorRole: actor?.role,
        descripcion: "Eliminacion fisica de item de catalogo (sin dependencias)",
        beforeData: current,
      });
    });

    return { data: null, mode: "hard", reason: "Eliminado correctamente." };
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async countExternalReferences(catalogoId: number): Promise<number> {
    const [actividades, activos] = await Promise.all([
      this.prisma.actividadVersion.count({
        where: { baseLicitudId: catalogoId },
      }),
      this.prisma.activoInformacion.count({
        where: {
          OR: [
            { tipoActivoId: catalogoId },
            { nivelId: catalogoId },
            { ambienteId: catalogoId },
            { clasificacionInfoId: catalogoId },
            { datosPersonalesId: catalogoId },
            { visibleInternetId: catalogoId },
            { fuenteActivoId: catalogoId },
            { bajaProgramadaId: catalogoId },
            { propiedadIntelectualId: catalogoId },
            { impactoId: catalogoId },
          ],
        },
      }),
    ]);

    return actividades + activos;
  }
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

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
    // eslint-disable-next-line no-misleading-character-class
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase()
    .trim();
}
