import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppIcon } from "../../components/AppIcon";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import {
  buildEmptyCatalogEntry,
  countTreeItems,
  formatCatalogDomainLabel,
  formatCatalogTypeLabel,
  getCatalogStatus,
  type CatalogEntry,
  type CatalogTreeDominio,
  type CatalogTreeItem,
} from "./catalogs-data";

// ─── API types ───────────────────────────────────────────────────────────────

type TreeResponse = { data: CatalogTreeDominio[] };
type MutationResponse = { data: CatalogEntry | null; mode?: string; reason?: string };

// ─── Page ────────────────────────────────────────────────────────────────────

export function CatalogsPage() {
  const user = useAuthStore((state) => state.user);
  const caps = getRoleCapabilities(user?.role);
  const queryClient = useQueryClient();

  const [editingItem, setEditingItem] = useState<CatalogEntry | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteResult, setDeleteResult] = useState<{ mode: string; reason: string } | null>(null);
  const [search, setSearch] = useState("");

  const treeQuery = useQuery({
    queryKey: ["catalogos", "tree"],
    queryFn: async () => {
      const res = await apiClient.get<TreeResponse>("/catalogos/tree");
      return res.data.data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (catalog: CatalogEntry) => {
      const payload = {
        dominio: catalog.dominio ?? "GENERAL",
        tipo: catalog.tipo,
        codigo: catalog.codigo,
        nombre: catalog.nombre,
        descripcion: catalog.descripcion,
        activo: catalog.activo,
        parentId: catalog.parentId ?? null,
        orden: catalog.orden ?? 0,
      };

      if (typeof catalog.id === "number") {
        const res = await apiClient.patch<MutationResponse>(`/catalogos/${catalog.id}`, payload);
        return res.data;
      }

      const res = await apiClient.post<MutationResponse>("/catalogos", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalogos"] });
      setEditingItem(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiClient.delete<MutationResponse>(`/catalogos/${id}`);
      return res.data;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["catalogos"] });
      setDeleteConfirmId(null);
      if (result.mode === "soft") {
        setDeleteResult({ mode: "soft", reason: result.reason ?? "" });
      }
    },
  });

  const tree = treeQuery.data ?? [];

  // Search filter: match on nombre, codigo, tipo
  const filteredTree = useMemo(() => {
    if (!search.trim()) return tree;
    const q = normalize(search);

    return tree
      .map((dominio) => ({
        ...dominio,
        tipos: dominio.tipos
          .map((tipo) => ({
            ...tipo,
            items: filterItems(tipo.items, q),
          }))
          .filter((tipo) => tipo.items.length > 0),
      }))
      .filter((dominio) => dominio.tipos.length > 0);
  }, [tree, search]);

  const totalItems = useMemo(
    () => tree.reduce((acc, d) => acc + d.tipos.reduce((a, t) => a + countTreeItems(t.items), 0), 0),
    [tree],
  );

  const filteredCount = useMemo(
    () => filteredTree.reduce((acc, d) => acc + d.tipos.reduce((a, t) => a + countTreeItems(t.items), 0), 0),
    [filteredTree],
  );

  return (
    <section className="catalogs-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Gobierno del dato</span>
          <div className="page-title-with-icon">
            <span className="page-title-icon">
              <AppIcon name="catalogs" size={22} strokeWidth={2.1} />
            </span>
            <h2>Catalogos del sistema</h2>
          </div>
          <p className="page-copy">
            Administre la estructura jerarquica de catalogos. Cada dominio agrupa categorias y estas
            contienen los campos que alimentan formularios y validaciones del sistema.
          </p>
          <p className="permission-hint">
            Rol actual: <strong>{caps.label}</strong>.{" "}
            {caps.catalogs.save
              ? "Puede crear, editar y eliminar items de catalogo."
              : "Solo consulta — administracion requiere rol de administrador."}
          </p>
        </div>

        <div className="registry-header-actions">
          {caps.catalogs.create && (
            <button
              type="button"
              className="button-primary"
              onClick={() => setEditingItem(buildEmptyCatalogEntry())}
            >
              Nuevo item
            </button>
          )}
        </div>
      </header>

      {/* Search bar */}
      <div className="org-toolbar panel">
        <label className="field" style={{ flex: 1 }}>
          <span>Buscar por nombre, codigo o tipo</span>
          <input
            className="input"
            placeholder="Ej. consentimiento, telefono, BASE_LICITUD..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span className="pill" style={{ alignSelf: "flex-end", marginBottom: "4px" }}>
          {search.trim()
            ? `${filteredCount} de ${totalItems} items`
            : `${totalItems} items totales`}
        </span>
      </div>

      {treeQuery.isError && (
        <section className="panel access-panel">
          <span className="brand-kicker">Sin conexion</span>
          <h3>Catalogos no disponibles</h3>
          <p className="page-copy">No fue posible obtener los catalogos desde el backend.</p>
        </section>
      )}

      {treeQuery.isLoading && (
        <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
          <span className="brand-kicker">Cargando catalogo jerarquico...</span>
        </div>
      )}

      {/* Delete result notification */}
      {deleteResult && (
        <div
          className="panel"
          style={{
            padding: "1rem 1.5rem",
            border: "1px solid var(--color-warning, #d97706)",
            borderRadius: "8px",
            backgroundColor: "var(--color-warning-bg, #fffbeb)",
            marginBottom: "0.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{deleteResult.reason}</span>
          <button
            type="button"
            className="button-secondary"
            onClick={() => setDeleteResult(null)}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Accordion tree */}
      <div className="catalog-tree">
        {filteredTree.map((dominio) => (
          <DominioAccordion
            key={dominio.dominio}
            dominio={dominio}
            caps={caps.catalogs}
            onEdit={setEditingItem}
            onAddChild={(parent) =>
              setEditingItem(
                buildEmptyCatalogEntry({
                  tipo: parent.tipo,
                  dominio: parent.dominio,
                  parentId: parent.id,
                }),
              )
            }
            onDeleteRequest={(id) => setDeleteConfirmId(id)}
            deleteConfirmId={deleteConfirmId}
            isDeleting={deleteMutation.isPending}
            onDeleteConfirm={(id) => deleteMutation.mutate(id)}
            onDeleteCancel={() => setDeleteConfirmId(null)}
          />
        ))}

        {filteredTree.length === 0 && !treeQuery.isLoading && !treeQuery.isError && (
          <div className="panel" style={{ padding: "2rem", textAlign: "center" }}>
            <p className="page-copy">No se encontraron items que coincidan con la busqueda.</p>
          </div>
        )}
      </div>

      {/* Edit / Create modal */}
      {editingItem && (
        <CatalogFormModal
          item={editingItem}
          isSaving={saveMutation.isPending}
          caps={caps.catalogs}
          onChange={setEditingItem}
          onClose={() => setEditingItem(null)}
          onSave={() => saveMutation.mutate(editingItem)}
          onToggleStatus={() =>
            setEditingItem({ ...editingItem, activo: !editingItem.activo })
          }
        />
      )}
    </section>
  );
}

// ─── Dominio accordion ────────────────────────────────────────────────────────

function DominioAccordion({
  dominio,
  caps,
  onEdit,
  onAddChild,
  onDeleteRequest,
  deleteConfirmId,
  isDeleting,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  dominio: CatalogTreeDominio;
  caps: ReturnType<typeof getRoleCapabilities>["catalogs"];
  onEdit: (item: CatalogEntry) => void;
  onAddChild: (parent: CatalogTreeItem) => void;
  onDeleteRequest: (id: number) => void;
  deleteConfirmId: number | null;
  isDeleting: boolean;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const itemCount = dominio.tipos.reduce((acc, t) => acc + countTreeItems(t.items), 0);

  return (
    <div className="catalog-accordion catalog-accordion-dominio">
      <button
        type="button"
        className="catalog-accordion-header"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="catalog-accordion-chevron">{open ? "▾" : "▸"}</span>
        <span className="catalog-accordion-label">
          {formatCatalogDomainLabel(dominio.dominio)}
        </span>
        <span className="pill catalog-accordion-count">{itemCount} items</span>
      </button>

      {open && (
        <div className="catalog-accordion-body">
          {dominio.tipos.map((tipo) => (
            <TipoAccordion
              key={tipo.tipo}
              tipo={tipo}
              dominio={dominio.dominio}
              caps={caps}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDeleteRequest={onDeleteRequest}
              deleteConfirmId={deleteConfirmId}
              isDeleting={isDeleting}
              onDeleteConfirm={onDeleteConfirm}
              onDeleteCancel={onDeleteCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Tipo accordion ───────────────────────────────────────────────────────────

function TipoAccordion({
  tipo,
  dominio,
  caps,
  onEdit,
  onAddChild,
  onDeleteRequest,
  deleteConfirmId,
  isDeleting,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  tipo: { tipo: string; items: CatalogTreeItem[] };
  dominio: string;
  caps: ReturnType<typeof getRoleCapabilities>["catalogs"];
  onEdit: (item: CatalogEntry) => void;
  onAddChild: (parent: CatalogTreeItem) => void;
  onDeleteRequest: (id: number) => void;
  deleteConfirmId: number | null;
  isDeleting: boolean;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
}) {
  const [open, setOpen] = useState(false);
  const activeCount = tipo.items.filter((i) => i.activo).length;

  return (
    <div className="catalog-accordion catalog-accordion-tipo">
      <button
        type="button"
        className="catalog-accordion-header catalog-accordion-header-tipo"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="catalog-accordion-chevron">{open ? "▾" : "▸"}</span>
        <span className="catalog-accordion-label">{formatCatalogTypeLabel(tipo.tipo)}</span>
        <span className="catalog-accordion-tipo-key">{tipo.tipo}</span>
        <span className="pill catalog-accordion-count">
          {activeCount}/{tipo.items.length}
        </span>
        {caps.create && (
          <button
            type="button"
            className="button-table-action catalog-add-child-btn"
            title="Agregar item a esta categoria"
            onClick={(e) => {
              e.stopPropagation();
              // Create a virtual parent node for pre-filling tipo and dominio
              onEdit({
                id: `new-${Date.now()}`,
                tipo: tipo.tipo,
                codigo: "",
                nombre: "",
                descripcion: "",
                activo: true,
                dominio,
                parentId: null,
                orden: tipo.items.length,
              });
            }}
          >
            + Nuevo item
          </button>
        )}
      </button>

      {open && (
        <div className="catalog-accordion-body catalog-items-list">
          {tipo.items.map((item) => (
            <CatalogItemRow
              key={item.id}
              item={item}
              depth={0}
              caps={caps}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDeleteRequest={onDeleteRequest}
              deleteConfirmId={deleteConfirmId}
              isDeleting={isDeleting}
              onDeleteConfirm={onDeleteConfirm}
              onDeleteCancel={onDeleteCancel}
            />
          ))}

          {tipo.items.length === 0 && (
            <div className="catalog-item-empty">Sin items en esta categoria.</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Item row (recursive for children) ───────────────────────────────────────

function CatalogItemRow({
  item,
  depth,
  caps,
  onEdit,
  onAddChild,
  onDeleteRequest,
  deleteConfirmId,
  isDeleting,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  item: CatalogTreeItem;
  depth: number;
  caps: ReturnType<typeof getRoleCapabilities>["catalogs"];
  onEdit: (item: CatalogEntry) => void;
  onAddChild: (parent: CatalogTreeItem) => void;
  onDeleteRequest: (id: number) => void;
  deleteConfirmId: number | null;
  isDeleting: boolean;
  onDeleteConfirm: (id: number) => void;
  onDeleteCancel: () => void;
}) {
  const [childrenOpen, setChildrenOpen] = useState(false);
  const hasChildren = item.children.length > 0;
  const isConfirming = deleteConfirmId === item.id;

  return (
    <div
      className="catalog-item-wrapper"
      style={{ paddingLeft: `${depth * 20}px` }}
    >
      <div className={`catalog-item-row ${item.activo ? "" : "catalog-item-inactive"}`}>
        {/* Expand toggle for sub-items */}
        {hasChildren ? (
          <button
            type="button"
            className="catalog-item-toggle"
            onClick={() => setChildrenOpen((v) => !v)}
            aria-label={childrenOpen ? "Contraer sub-items" : "Expandir sub-items"}
          >
            {childrenOpen ? "▾" : "▸"}
          </button>
        ) : (
          <span className="catalog-item-toggle catalog-item-toggle-leaf">·</span>
        )}

        {/* Status pill */}
        <span
          className={
            item.activo
              ? "pill status-pill-vigente catalog-item-status"
              : "pill status-pill-archivado catalog-item-status"
          }
        >
          {getCatalogStatus(item)}
        </span>

        {/* Name and code */}
        <span className="catalog-item-name">{item.nombre}</span>
        <span className="catalog-item-code">{item.codigo}</span>
        {item.descripcion && (
          <span className="catalog-item-desc">{item.descripcion}</span>
        )}

        {/* Admin actions */}
        {caps.update && (
          <div className="catalog-item-actions">
            <button
              type="button"
              className="button-table-action"
              title="Editar item"
              onClick={() =>
                onEdit({
                  id: item.id,
                  tipo: item.tipo,
                  codigo: item.codigo,
                  nombre: item.nombre,
                  descripcion: item.descripcion ?? "",
                  activo: item.activo,
                  dominio: item.dominio,
                  parentId: item.parentId,
                  orden: item.orden,
                })
              }
            >
              Editar
            </button>

            {caps.create && (
              <button
                type="button"
                className="button-table-action"
                title="Agregar sub-item"
                onClick={() => onAddChild(item)}
              >
                + Sub-item
              </button>
            )}

            {caps.delete && !isConfirming && (
              <button
                type="button"
                className="button-table-action button-table-action-danger"
                title="Eliminar item"
                onClick={() => onDeleteRequest(item.id)}
              >
                Eliminar
              </button>
            )}

            {isConfirming && (
              <span className="catalog-delete-confirm">
                <span>¿Confirmar eliminacion?</span>
                <button
                  type="button"
                  className="button-table-action button-table-action-danger"
                  disabled={isDeleting}
                  onClick={() => onDeleteConfirm(item.id)}
                >
                  {isDeleting ? "..." : "Si, eliminar"}
                </button>
                <button
                  type="button"
                  className="button-table-action"
                  onClick={onDeleteCancel}
                >
                  Cancelar
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && childrenOpen && (
        <div className="catalog-children">
          {item.children.map((child) => (
            <CatalogItemRow
              key={child.id}
              item={child}
              depth={depth + 1}
              caps={caps}
              onEdit={onEdit}
              onAddChild={onAddChild}
              onDeleteRequest={onDeleteRequest}
              deleteConfirmId={deleteConfirmId}
              isDeleting={isDeleting}
              onDeleteConfirm={onDeleteConfirm}
              onDeleteCancel={onDeleteCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit / create form modal ─────────────────────────────────────────────────

function CatalogFormModal({
  item,
  isSaving,
  caps,
  onChange,
  onClose,
  onSave,
  onToggleStatus,
}: {
  item: CatalogEntry;
  isSaving: boolean;
  caps: ReturnType<typeof getRoleCapabilities>["catalogs"];
  onChange: (item: CatalogEntry) => void;
  onClose: () => void;
  onSave: () => void;
  onToggleStatus: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const isNew = typeof item.id === "string";

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div
      className="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-form-title"
    >
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div ref={dialogRef} className="report-preview-modal-dialog catalog-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">
              {isNew ? "Nuevo item de catalogo" : "Editar item de catalogo"}
            </span>
            <div className="page-title-with-icon page-title-with-icon-modal">
              <span className="page-title-icon">
                <AppIcon name="catalogs" size={20} strokeWidth={2.1} />
              </span>
              <h3 id="catalog-form-title">{item.nombre || "Sin nombre"}</h3>
            </div>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <div className="catalog-form-grid">
            <label className="field">
              <span>Dominio</span>
              <select
                className="input"
                value={item.dominio ?? "GENERAL"}
                onChange={(e) => onChange({ ...item, dominio: e.target.value })}
                disabled={!caps.update}
              >
                <option value="GENERAL">General</option>
                <option value="TRATAMIENTOS">Tratamientos</option>
                <option value="EIPD">EIPD</option>
                <option value="RIESGOS">Riesgos</option>
              </select>
            </label>

            <label className="field">
              <span>Tipo / Categoria</span>
              <input
                className="input"
                value={item.tipo}
                placeholder="Ej. BASE_LICITUD"
                onChange={(e) => onChange({ ...item, tipo: e.target.value.toUpperCase() })}
                disabled={!caps.update}
              />
            </label>

            <label className="field">
              <span>Codigo</span>
              <input
                className="input"
                value={item.codigo}
                placeholder="Ej. CONSENTIMIENTO"
                onChange={(e) => onChange({ ...item, codigo: e.target.value.toUpperCase() })}
                disabled={!caps.update}
              />
            </label>

            <label className="field">
              <span>Orden</span>
              <input
                className="input"
                type="number"
                min={0}
                value={item.orden ?? 0}
                onChange={(e) => onChange({ ...item, orden: Number(e.target.value) })}
                disabled={!caps.update}
              />
            </label>

            <label className="field full-width">
              <span>Nombre</span>
              <input
                className="input"
                value={item.nombre}
                placeholder="Nombre visible en formularios"
                onChange={(e) => onChange({ ...item, nombre: e.target.value })}
                disabled={!caps.update}
              />
            </label>

            <label className="field full-width">
              <span>Descripcion</span>
              <textarea
                className="input textarea"
                rows={3}
                value={item.descripcion}
                placeholder="Descripcion opcional del item"
                onChange={(e) => onChange({ ...item, descripcion: e.target.value })}
                disabled={!caps.update}
              />
            </label>

            {item.parentId !== null && item.parentId !== undefined && (
              <div className="field full-width">
                <span className="catalog-parent-hint">
                  Sub-item del catalogo padre ID: {item.parentId}
                </span>
              </div>
            )}
          </div>

          <div className="activity-action-modal-actions">
            {caps.updateStatus && !isNew && (
              <button
                type="button"
                className={
                  item.activo
                    ? "button-table-action button-table-action-danger"
                    : "button-table-action"
                }
                onClick={onToggleStatus}
              >
                {item.activo ? "Desactivar" : "Activar"}
              </button>
            )}
            {caps.save && (
              <button
                type="button"
                className="button-table-action"
                disabled={isSaving || !item.nombre.trim() || !item.codigo.trim() || !item.tipo.trim()}
                onClick={onSave}
              >
                {isSaving ? "Guardando..." : "Guardar"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function filterItems(items: CatalogTreeItem[], query: string): CatalogTreeItem[] {
  return items
    .map((item) => {
      const matchesSelf =
        normalize(item.nombre).includes(query) ||
        normalize(item.codigo).includes(query) ||
        (item.descripcion ? normalize(item.descripcion).includes(query) : false);

      const filteredChildren = filterItems(item.children, query);

      if (matchesSelf || filteredChildren.length > 0) {
        return { ...item, children: filteredChildren };
      }

      return null;
    })
    .filter((item): item is CatalogTreeItem => item !== null);
}
