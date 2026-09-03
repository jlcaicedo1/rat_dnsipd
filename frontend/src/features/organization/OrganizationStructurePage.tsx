import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { AppIcon } from "../../components/AppIcon";
import { ExecutiveKpiGrid, type ExecutiveKpiItem } from "../../components/ExecutiveKpiGrid";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";

// ─── domain types ─────────────────────────────────────────────────────────────

type TipoProceso = {
  id: number;
  nombre: string;
  descripcion: string | null;
};

type Dependencia = {
  id: number;
  nombre: string;
  sigla: string | null;
  responsable: string | null;
  descripcion: string | null;
  activo: boolean;
  tipoProceso: TipoProceso;
  _count: { subdirecciones: number; rats: number };
};

type Subdireccion = {
  id: number;
  nombre: string;
  sigla: string | null;
  responsable: string | null;
  descripcion: string | null;
  activo: boolean;
  dependenciaId: number;
  _count: { rats: number };
};

type DepFormState = {
  nombre: string;
  sigla: string;
  responsable: string;
  descripcion: string;
  tipoProcesoId: number | "";
};

type SubFormState = {
  nombre: string;
  sigla: string;
  responsable: string;
  descripcion: string;
};

// ─── main page ────────────────────────────────────────────────────────────────

export function OrganizationStructurePage() {
  const qc = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const role = getRoleCapabilities(user?.role);
  const canEdit = role.organization.save;
  const canToggle = role.organization.updateStatus;

  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<"Todos" | "Activa" | "Inactiva">("Todos");

  const [depModal, setDepModal] = useState<{
    mode: "create" | "edit";
    item?: Dependencia;
  } | null>(null);

  const [subModal, setSubModal] = useState<{
    mode: "create" | "edit";
    parentDep: Dependencia;
    item?: Subdireccion;
  } | null>(null);

  const [confirmDeleteDep, setConfirmDeleteDep] = useState<number | null>(null);
  const [confirmDeleteSub, setConfirmDeleteSub] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── queries ──
  const tiposQuery = useQuery({
    queryKey: ["tipo-proceso"],
    queryFn: () =>
      apiClient
        .get<{ data: TipoProceso[] }>("/tipo-proceso")
        .then((r) => r.data.data),
    staleTime: 120_000,
  });

  const depsQuery = useQuery({
    queryKey: ["dependencias"],
    queryFn: () =>
      apiClient
        .get<{ data: Dependencia[] }>("/dependencias")
        .then((r) => r.data.data),
    staleTime: 30_000,
  });

  const subsQuery = useQuery({
    queryKey: ["subdirecciones"],
    queryFn: () =>
      apiClient
        .get<{ data: Subdireccion[] }>("/subdirecciones")
        .then((r) => r.data.data),
    staleTime: 30_000,
  });

  const tipos = tiposQuery.data ?? [];
  const allDeps = depsQuery.data ?? [];
  const allSubs = subsQuery.data ?? [];

  // ── invalidation ──
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["dependencias"] });
    qc.invalidateQueries({ queryKey: ["subdirecciones"] });
  };

  // ── mutations ──
  const saveDep = useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      id
        ? apiClient.patch(`/dependencias/${id}`, body)
        : apiClient.post("/dependencias", body),
    onSuccess: () => {
      refresh();
      setDepModal(null);
    },
  });

  const deleteDep = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/dependencias/${id}`),
    onSuccess: () => {
      refresh();
      setConfirmDeleteDep(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al eliminar la dependencia.";
      setDeleteError(msg);
    },
  });

  const saveSub = useMutation({
    mutationFn: ({ id, body }: { id?: number; body: Record<string, unknown> }) =>
      id
        ? apiClient.patch(`/subdirecciones/${id}`, body)
        : apiClient.post("/subdirecciones", body),
    onSuccess: () => {
      refresh();
      setSubModal(null);
    },
  });

  const deleteSub = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/subdirecciones/${id}`),
    onSuccess: () => {
      refresh();
      setConfirmDeleteSub(null);
      setDeleteError(null);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al eliminar la subdireccion.";
      setDeleteError(msg);
    },
  });

  // ── derived data ──
  const norm = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase();

  const visibleDeps = useMemo(() => {
    const q = norm(search.trim());
    return allDeps.filter((d) => {
      if (tipoFilter !== "Todos" && d.tipoProceso.nombre !== tipoFilter) return false;
      if (statusFilter === "Activa" && !d.activo) return false;
      if (statusFilter === "Inactiva" && d.activo) return false;
      if (q) {
        const hay = norm(
          [d.nombre, d.sigla ?? "", d.responsable ?? ""].join(" "),
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allDeps, tipoFilter, statusFilter, search]);

  const subsByDep = useMemo(() => {
    const map = new Map<number, Subdireccion[]>();
    for (const s of allSubs) {
      const arr = map.get(s.dependenciaId) ?? [];
      arr.push(s);
      map.set(s.dependenciaId, arr);
    }
    return map;
  }, [allSubs]);

  const grouped = useMemo(() => {
    const map = new Map<number, { tipo: TipoProceso; deps: Dependencia[] }>();
    for (const dep of visibleDeps) {
      const tp = dep.tipoProceso;
      if (!map.has(tp.id)) map.set(tp.id, { tipo: tp, deps: [] });
      map.get(tp.id)!.deps.push(dep);
    }
    return Array.from(map.values()).sort((a, b) =>
      a.tipo.nombre.localeCompare(b.tipo.nombre),
    );
  }, [visibleDeps]);

  // ── KPIs ──
  const inactivas = allDeps.filter((d) => !d.activo).length;
  const sinRat = allDeps.filter((d) => d._count.rats === 0).length;
  const kpis: ExecutiveKpiItem[] = [
    {
      label: "Total dependencias",
      value: allDeps.length,
      icon: "organization" as const,
      tone: "neutral",
    },
    {
      label: "Activas",
      value: allDeps.filter((d) => d.activo).length,
      icon: "checklist" as const,
      tone: "success",
    },
    {
      label: "Inactivas",
      value: inactivas,
      icon: "risks" as const,
      tone: inactivas > 0 ? "warning" : "neutral",
    },
    {
      label: "Sin RAT asignado",
      value: sinRat,
      icon: "audit" as const,
      tone: sinRat > 0 ? "warning" : "success",
    },
  ];

  if (!role.organization.view) {
    return (
      <section className="panel access-panel">
        <span className="brand-kicker">Acceso restringido</span>
        <h2>Administracion de dependencias</h2>
        <p className="page-copy">
          Esta vista queda reservada para perfiles administradores porque afecta maestros,
          permisos, filtros y disponibilidad de nuevas dependencias dentro del sistema.
        </p>
      </section>
    );
  }

  return (
    <section className="org-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Gobierno maestro</span>
          <div className="page-title-with-icon">
            <span className="page-title-icon">
              <AppIcon name="organization" size={22} strokeWidth={2.1} />
            </span>
            <h2>Estructura organizacional</h2>
          </div>
          <p className="page-copy">
            Fuente única de verdad para dependencias y subdirecciones. Cada cambio persiste en
            base de datos con trazabilidad de auditoría completa.
          </p>
        </div>
        {canEdit ? (
          <div className="registry-header-actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => setDepModal({ mode: "create" })}
            >
              Nueva dependencia
            </button>
          </div>
        ) : null}
      </header>

      <ExecutiveKpiGrid items={kpis} />

      <div className="org-toolbar panel">
        <label className="field">
          <span>Buscar</span>
          <input
            className="input"
            placeholder="Nombre, sigla o responsable"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <label className="field">
          <span>Tipo de proceso</span>
          <select
            className="input"
            value={tipoFilter}
            onChange={(e) => setTipoFilter(e.target.value)}
          >
            <option value="Todos">Todos</option>
            {tipos.map((t) => (
              <option key={t.id} value={t.nombre}>
                {t.nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Estado</span>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as "Todos" | "Activa" | "Inactiva")
            }
          >
            <option value="Todos">Todos</option>
            <option value="Activa">Activa</option>
            <option value="Inactiva">Inactiva</option>
          </select>
        </label>
      </div>

      <div
        className="panel-heading panel-heading-compact panel"
        style={{ marginBottom: "0.5rem" }}
      >
        <div>
          <span className="brand-kicker">Árbol jerárquico</span>
          <h3>Dependencias por tipo de proceso</h3>
        </div>
        <div className="actions">
          <span className="pill">{visibleDeps.length} dependencias</span>
        </div>
      </div>

      {deleteError ? (
        <div
          className="panel"
          style={{ background: "var(--color-danger-bg, #fef2f2)", marginBottom: "0.5rem" }}
        >
          <p style={{ color: "var(--color-danger, #dc2626)", margin: 0 }}>
            {deleteError}{" "}
            <button
              type="button"
              className="button-table-action button-table-action-secondary"
              onClick={() => setDeleteError(null)}
            >
              Cerrar
            </button>
          </p>
        </div>
      ) : null}

      {depsQuery.isLoading ? (
        <div className="panel">
          <p className="page-copy">Cargando estructura organizacional…</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="panel">
          <p className="page-copy">
            No se encontraron dependencias con los filtros actuales.
          </p>
        </div>
      ) : (
        <div className="catalog-tree">
          {grouped.map(({ tipo, deps }) => (
            <TipoProcesoGroup
              key={tipo.id}
              tipo={tipo}
              dependencias={deps}
              subsByDep={subsByDep}
              canEdit={canEdit}
              canToggle={canToggle}
              confirmDeleteDep={confirmDeleteDep}
              confirmDeleteSub={confirmDeleteSub}
              onEditDep={(dep) => {
                setDeleteError(null);
                setDepModal({ mode: "edit", item: dep });
              }}
              onToggleDep={(dep) =>
                saveDep.mutate({ id: dep.id, body: { activo: !dep.activo } })
              }
              onRequestDeleteDep={(id) => {
                setDeleteError(null);
                setConfirmDeleteDep(id);
              }}
              onCancelDeleteDep={() => setConfirmDeleteDep(null)}
              onConfirmDeleteDep={(id) => deleteDep.mutate(id)}
              onNewSub={(dep) => {
                setDeleteError(null);
                setSubModal({ mode: "create", parentDep: dep });
              }}
              onEditSub={(dep, sub) => {
                setDeleteError(null);
                setSubModal({ mode: "edit", parentDep: dep, item: sub });
              }}
              onToggleSub={(sub) =>
                saveSub.mutate({ id: sub.id, body: { activo: !sub.activo } })
              }
              onRequestDeleteSub={(id) => {
                setDeleteError(null);
                setConfirmDeleteSub(id);
              }}
              onCancelDeleteSub={() => setConfirmDeleteSub(null)}
              onConfirmDeleteSub={(id) => deleteSub.mutate(id)}
            />
          ))}
        </div>
      )}

      {depModal ? (
        <DependenciaFormModal
          tipos={tipos}
          mode={depModal.mode}
          item={depModal.item}
          isLoading={saveDep.isPending}
          error={(saveDep.error as Error | null)?.message}
          onClose={() => setDepModal(null)}
          onSubmit={(body) => saveDep.mutate({ id: depModal.item?.id, body })}
        />
      ) : null}

      {subModal ? (
        <SubdireccionFormModal
          parentDep={subModal.parentDep}
          mode={subModal.mode}
          item={subModal.item}
          isLoading={saveSub.isPending}
          error={(saveSub.error as Error | null)?.message}
          onClose={() => setSubModal(null)}
          onSubmit={(body) => saveSub.mutate({ id: subModal.item?.id, body })}
        />
      ) : null}
    </section>
  );
}

// ─── accordion por tipo de proceso ───────────────────────────────────────────

function TipoProcesoGroup({
  tipo,
  dependencias,
  subsByDep,
  canEdit,
  canToggle,
  confirmDeleteDep,
  confirmDeleteSub,
  onEditDep,
  onToggleDep,
  onRequestDeleteDep,
  onCancelDeleteDep,
  onConfirmDeleteDep,
  onNewSub,
  onEditSub,
  onToggleSub,
  onRequestDeleteSub,
  onCancelDeleteSub,
  onConfirmDeleteSub,
}: {
  tipo: TipoProceso;
  dependencias: Dependencia[];
  subsByDep: Map<number, Subdireccion[]>;
  canEdit: boolean;
  canToggle: boolean;
  confirmDeleteDep: number | null;
  confirmDeleteSub: number | null;
  onEditDep: (dep: Dependencia) => void;
  onToggleDep: (dep: Dependencia) => void;
  onRequestDeleteDep: (id: number) => void;
  onCancelDeleteDep: () => void;
  onConfirmDeleteDep: (id: number) => void;
  onNewSub: (dep: Dependencia) => void;
  onEditSub: (dep: Dependencia, sub: Subdireccion) => void;
  onToggleSub: (sub: Subdireccion) => void;
  onRequestDeleteSub: (id: number) => void;
  onCancelDeleteSub: () => void;
  onConfirmDeleteSub: (id: number) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="catalog-accordion catalog-accordion-dominio">
      <button
        type="button"
        className="catalog-accordion-header"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="catalog-accordion-chevron">{open ? "▾" : "▸"}</span>
        <span className="catalog-accordion-label">{tipo.nombre}</span>
        <span className="pill catalog-accordion-count">
          {dependencias.length} dependencia
          {dependencias.length !== 1 ? "s" : ""}
        </span>
      </button>

      {open && (
        <div className="catalog-accordion-body">
          {dependencias.map((dep) => (
            <DependenciaItem
              key={dep.id}
              dep={dep}
              subdirecciones={subsByDep.get(dep.id) ?? []}
              canEdit={canEdit}
              canToggle={canToggle}
              confirmDeleteDep={confirmDeleteDep}
              confirmDeleteSub={confirmDeleteSub}
              onEdit={() => onEditDep(dep)}
              onToggle={() => onToggleDep(dep)}
              onRequestDelete={() => onRequestDeleteDep(dep.id)}
              onCancelDelete={onCancelDeleteDep}
              onConfirmDelete={() => onConfirmDeleteDep(dep.id)}
              onNewSub={() => onNewSub(dep)}
              onEditSub={(sub) => onEditSub(dep, sub)}
              onToggleSub={onToggleSub}
              onRequestDeleteSub={onRequestDeleteSub}
              onCancelDeleteSub={onCancelDeleteSub}
              onConfirmDeleteSub={onConfirmDeleteSub}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── fila de dependencia ─────────────────────────────────────────────────────

function DependenciaItem({
  dep,
  subdirecciones,
  canEdit,
  canToggle,
  confirmDeleteDep,
  confirmDeleteSub,
  onEdit,
  onToggle,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onNewSub,
  onEditSub,
  onToggleSub,
  onRequestDeleteSub,
  onCancelDeleteSub,
  onConfirmDeleteSub,
}: {
  dep: Dependencia;
  subdirecciones: Subdireccion[];
  canEdit: boolean;
  canToggle: boolean;
  confirmDeleteDep: number | null;
  confirmDeleteSub: number | null;
  onEdit: () => void;
  onToggle: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onNewSub: () => void;
  onEditSub: (sub: Subdireccion) => void;
  onToggleSub: (sub: Subdireccion) => void;
  onRequestDeleteSub: (id: number) => void;
  onCancelDeleteSub: () => void;
  onConfirmDeleteSub: (id: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const hasSubs = subdirecciones.length > 0;
  const isConfirming = confirmDeleteDep === dep.id;

  return (
    <div className="catalog-accordion catalog-accordion-tipo">
      <button
        type="button"
        className="catalog-accordion-header catalog-accordion-header-tipo"
        aria-expanded={open}
        onClick={() => hasSubs && setOpen((v) => !v)}
        style={hasSubs ? undefined : { cursor: "default" }}
      >
        {hasSubs ? (
          <span className="catalog-accordion-chevron">{open ? "▾" : "▸"}</span>
        ) : (
          <span className="catalog-item-toggle catalog-item-toggle-leaf">·</span>
        )}
        {dep.sigla ? (
          <span className="catalog-accordion-tipo-key">{dep.sigla}</span>
        ) : null}
        <span className="catalog-accordion-label">{dep.nombre}</span>
        {hasSubs ? (
          <span className="pill catalog-accordion-count">
            {subdirecciones.length} subdir.
          </span>
        ) : null}
        <span
          className={
            dep.activo
              ? "pill status-pill-vigente catalog-item-status"
              : "pill status-pill-archivado catalog-item-status"
          }
        >
          {dep.activo ? "Activa" : "Inactiva"}
        </span>
        <span className="catalog-item-desc">
          {dep._count.rats} RAT · {dep._count.subdirecciones} subdir.
          {dep.responsable ? ` · ${dep.responsable}` : ""}
        </span>

        <div className="catalog-item-actions" onClick={(e) => e.stopPropagation()}>
          {isConfirming ? (
            <>
              <span className="catalog-item-desc">¿Confirmar eliminación?</span>
              <button
                type="button"
                className="button-table-action button-table-action-danger"
                onClick={onConfirmDelete}
              >
                Eliminar
              </button>
              <button
                type="button"
                className="button-table-action button-table-action-secondary"
                onClick={onCancelDelete}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {canEdit ? (
                <button
                  type="button"
                  className="button-table-action button-table-action-secondary"
                  onClick={onEdit}
                >
                  Editar
                </button>
              ) : null}
              {canToggle ? (
                <button
                  type="button"
                  className={
                    dep.activo
                      ? "button-table-action button-table-action-danger"
                      : "button-table-action"
                  }
                  onClick={onToggle}
                >
                  {dep.activo ? "Desactivar" : "Activar"}
                </button>
              ) : null}
              {canEdit ? (
                <>
                  <button
                    type="button"
                    className="button-table-action"
                    onClick={onNewSub}
                  >
                    + Subdir.
                  </button>
                  <button
                    type="button"
                    className="button-table-action button-table-action-danger"
                    onClick={onRequestDelete}
                  >
                    Eliminar
                  </button>
                </>
              ) : null}
            </>
          )}
        </div>
      </button>

      {open && hasSubs && (
        <div className="catalog-accordion-body catalog-items-list">
          {subdirecciones.map((sub) => (
            <SubdireccionItem
              key={sub.id}
              sub={sub}
              canEdit={canEdit}
              canToggle={canToggle}
              isConfirming={confirmDeleteSub === sub.id}
              onEdit={() => onEditSub(sub)}
              onToggle={() => onToggleSub(sub)}
              onRequestDelete={() => onRequestDeleteSub(sub.id)}
              onCancelDelete={onCancelDeleteSub}
              onConfirmDelete={() => onConfirmDeleteSub(sub.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── fila de subdireccion ─────────────────────────────────────────────────────

function SubdireccionItem({
  sub,
  canEdit,
  canToggle,
  isConfirming,
  onEdit,
  onToggle,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  sub: Subdireccion;
  canEdit: boolean;
  canToggle: boolean;
  isConfirming: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <div className="catalog-item-wrapper">
      <div
        className={`catalog-item-row ${sub.activo ? "" : "catalog-item-inactive"}`}
      >
        <span className="catalog-item-toggle catalog-item-toggle-leaf">·</span>
        <span
          className={
            sub.activo
              ? "pill status-pill-vigente catalog-item-status"
              : "pill status-pill-archivado catalog-item-status"
          }
        >
          {sub.activo ? "Activa" : "Inactiva"}
        </span>
        <span className="catalog-item-name">{sub.nombre}</span>
        {sub.sigla ? (
          <span className="catalog-item-code">{sub.sigla}</span>
        ) : null}
        <span className="catalog-item-desc">
          {sub._count.rats} RAT
          {sub.responsable ? ` · ${sub.responsable}` : ""}
        </span>

        <div className="catalog-item-actions">
          {isConfirming ? (
            <>
              <span className="catalog-item-desc">¿Confirmar?</span>
              <button
                type="button"
                className="button-table-action button-table-action-danger"
                onClick={onConfirmDelete}
              >
                Sí, eliminar
              </button>
              <button
                type="button"
                className="button-table-action button-table-action-secondary"
                onClick={onCancelDelete}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              {canEdit ? (
                <button
                  type="button"
                  className="button-table-action button-table-action-secondary"
                  onClick={onEdit}
                >
                  Editar
                </button>
              ) : null}
              {canToggle ? (
                <button
                  type="button"
                  className={
                    sub.activo
                      ? "button-table-action button-table-action-danger"
                      : "button-table-action"
                  }
                  onClick={onToggle}
                >
                  {sub.activo ? "Desactivar" : "Activar"}
                </button>
              ) : null}
              {canEdit ? (
                <button
                  type="button"
                  className="button-table-action button-table-action-danger"
                  onClick={onRequestDelete}
                >
                  Eliminar
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── modal de dependencia ─────────────────────────────────────────────────────

function DependenciaFormModal({
  tipos,
  mode,
  item,
  isLoading,
  error,
  onClose,
  onSubmit,
}: {
  tipos: TipoProceso[];
  mode: "create" | "edit";
  item?: Dependencia;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<DepFormState>({
    nombre: item?.nombre ?? "",
    sigla: item?.sigla ?? "",
    responsable: item?.responsable ?? "",
    descripcion: item?.descripcion ?? "",
    tipoProcesoId: item?.tipoProceso.id ?? "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.tipoProcesoId || !form.nombre.trim()) return;
    onSubmit({
      nombre: form.nombre.trim(),
      sigla: form.sigla.trim() || undefined,
      responsable: form.responsable.trim() || undefined,
      descripcion: form.descripcion.trim() || undefined,
      tipoProcesoId: Number(form.tipoProcesoId),
    });
  }

  return (
    <div
      className="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="dep-form-title"
    >
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="report-preview-modal-dialog org-detail-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Estructura organizacional</span>
            <h3 id="dep-form-title">
              {mode === "create" ? "Nueva dependencia" : "Editar dependencia"}
            </h3>
          </div>
          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="detail-form-grid">
              <label className="field detail-form-span">
                <span>Nombre *</span>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Sigla</span>
                <input
                  className="input"
                  value={form.sigla}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sigla: e.target.value.toUpperCase() }))
                  }
                  placeholder="Ej. DSGSIF"
                />
              </label>

              <label className="field">
                <span>Responsable</span>
                <input
                  className="input"
                  value={form.responsable}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, responsable: e.target.value }))
                  }
                  placeholder="Cargo o nombre del responsable"
                />
              </label>

              <label className="field detail-form-span">
                <span>Tipo de proceso *</span>
                <select
                  className="input"
                  value={form.tipoProcesoId}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tipoProcesoId: e.target.value ? Number(e.target.value) : "",
                    }))
                  }
                  required
                >
                  <option value="">Seleccionar tipo…</option>
                  {tipos.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nombre}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field detail-form-span">
                <span>Descripción</span>
                <textarea
                  className="input"
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descripcion: e.target.value }))
                  }
                  rows={3}
                  placeholder="Descripción funcional de la dependencia"
                />
              </label>
            </div>

            {error ? (
              <p
                style={{
                  color: "var(--color-danger, #dc2626)",
                  marginTop: "0.75rem",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </p>
            ) : null}

            <div
              className="activity-action-modal-actions"
              style={{ marginTop: "1rem" }}
            >
              <button
                type="submit"
                className="button-primary"
                disabled={
                  isLoading || !form.nombre.trim() || !form.tipoProcesoId
                }
              >
                {isLoading
                  ? "Guardando…"
                  : mode === "create"
                    ? "Crear dependencia"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── modal de subdireccion ────────────────────────────────────────────────────

function SubdireccionFormModal({
  parentDep,
  mode,
  item,
  isLoading,
  error,
  onClose,
  onSubmit,
}: {
  parentDep: Dependencia;
  mode: "create" | "edit";
  item?: Subdireccion;
  isLoading: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (body: Record<string, unknown>) => void;
}) {
  const [form, setForm] = useState<SubFormState>({
    nombre: item?.nombre ?? "",
    sigla: item?.sigla ?? "",
    responsable: item?.responsable ?? "",
    descripcion: item?.descripcion ?? "",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nombre.trim()) return;
    onSubmit({
      nombre: form.nombre.trim(),
      sigla: form.sigla.trim() || undefined,
      responsable: form.responsable.trim() || undefined,
      descripcion: form.descripcion.trim() || undefined,
      dependenciaId: parentDep.id,
    });
  }

  return (
    <div
      className="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-form-title"
    >
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="report-preview-modal-dialog org-detail-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">
              {parentDep.sigla ?? parentDep.nombre}
            </span>
            <h3 id="sub-form-title">
              {mode === "create" ? "Nueva subdireccion" : "Editar subdireccion"}
            </h3>
          </div>
          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <form onSubmit={handleSubmit}>
            <div className="detail-form-grid">
              <label className="field detail-form-span">
                <span>Nombre *</span>
                <input
                  className="input"
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  required
                />
              </label>

              <label className="field">
                <span>Sigla</span>
                <input
                  className="input"
                  value={form.sigla}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sigla: e.target.value.toUpperCase() }))
                  }
                  placeholder="Ej. SDTI"
                />
              </label>

              <label className="field">
                <span>Responsable</span>
                <input
                  className="input"
                  value={form.responsable}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, responsable: e.target.value }))
                  }
                  placeholder="Cargo o nombre"
                />
              </label>

              <label className="field detail-form-span">
                <span>Descripción</span>
                <textarea
                  className="input"
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descripcion: e.target.value }))
                  }
                  rows={2}
                  placeholder="Descripción de la subdireccion"
                />
              </label>
            </div>

            {error ? (
              <p
                style={{
                  color: "var(--color-danger, #dc2626)",
                  marginTop: "0.75rem",
                  fontSize: "0.875rem",
                }}
              >
                {error}
              </p>
            ) : null}

            <div
              className="activity-action-modal-actions"
              style={{ marginTop: "1rem" }}
            >
              <button
                type="submit"
                className="button-primary"
                disabled={isLoading || !form.nombre.trim()}
              >
                {isLoading
                  ? "Guardando…"
                  : mode === "create"
                    ? "Crear subdireccion"
                    : "Guardar cambios"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
