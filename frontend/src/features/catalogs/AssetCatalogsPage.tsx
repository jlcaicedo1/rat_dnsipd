import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppIcon } from "../../components/AppIcon";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import {
  buildEmptyCatalogEntry,
  formatCatalogTypeLabel,
  getCatalogStatus,
  getCatalogTypes,
  type CatalogEntry,
  type CatalogStatus,
} from "./catalogs-data";

type CatalogosResponse = {
  data: CatalogEntry[];
};

type CatalogoMutationResponse = {
  data: CatalogEntry;
};

const ASSET_DOMAIN = "ACTIVOS";

export function AssetCatalogsPage() {
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState<"Todos" | CatalogStatus>("Todos");
  const [activeCatalogId, setActiveCatalogId] = useState<number | string | null>(null);
  const [draftCatalog, setDraftCatalog] = useState<CatalogEntry | null>(null);

  const catalogosQuery = useQuery({
    queryKey: ["catalogos", "activos-only"],
    queryFn: async () => {
      const response = await apiClient.get<CatalogosResponse>("/catalogos", {
        params: { dominio: ASSET_DOMAIN },
      });
      return response.data.data;
    },
  });

  const saveCatalogMutation = useMutation({
    mutationFn: async (catalog: CatalogEntry) => {
      const payload = {
        tipo: catalog.tipo,
        codigo: catalog.codigo,
        nombre: catalog.nombre,
        descripcion: catalog.descripcion,
        activo: catalog.activo,
        dominio: ASSET_DOMAIN,
      };

      if (typeof catalog.id === "number") {
        const response = await apiClient.patch<CatalogoMutationResponse>(
          `/catalogos/${catalog.id}`,
          payload,
        );

        return response.data.data;
      }

      const response = await apiClient.post<CatalogoMutationResponse>("/catalogos", payload);
      return response.data.data;
    },
    onSuccess: async (savedCatalog) => {
      await catalogosQuery.refetch();
      setDraftCatalog(savedCatalog);
      setActiveCatalogId(savedCatalog.id);
    },
  });

  const entries = catalogosQuery.data ?? [];
  const typeOptions = useMemo(() => getCatalogTypes(entries), [entries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = normalize(search);

    return entries.filter((entry) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalize([formatCatalogTypeLabel(entry.tipo), entry.codigo, entry.nombre, entry.descripcion].join(" ")).includes(
          normalizedSearch,
        );
      const matchesType = typeFilter === "Todos" || entry.tipo === typeFilter;
      const matchesStatus =
        statusFilter === "Todos" || getCatalogStatus(entry) === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [entries, search, statusFilter, typeFilter]);

  const activeCatalog = useMemo(() => {
    if (draftCatalog) {
      return draftCatalog;
    }

    return (
      filteredEntries.find((entry) => entry.id === activeCatalogId) ??
      entries.find((entry) => entry.id === activeCatalogId) ??
      null
    );
  }, [activeCatalogId, draftCatalog, entries, filteredEntries]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (activeCatalog) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeCatalog]);

  useEffect(() => {
    if (!activeCatalog || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveCatalogId(null);
        setDraftCatalog(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeCatalog]);

  function openCatalog(entry: CatalogEntry) {
    setDraftCatalog({ ...entry, dominio: ASSET_DOMAIN });
    setActiveCatalogId(entry.id);
  }

  function handleSaveCatalog() {
    if (!draftCatalog || saveCatalogMutation.isPending) {
      return;
    }

    saveCatalogMutation.mutate({
      ...draftCatalog,
      dominio: ASSET_DOMAIN,
      tipo: draftCatalog.tipo.trim(),
      codigo: draftCatalog.codigo.trim().toUpperCase(),
      nombre: draftCatalog.nombre.trim(),
      descripcion: draftCatalog.descripcion.trim(),
    });
  }

  function handleToggleStatus() {
    if (!draftCatalog) {
      return;
    }

    setDraftCatalog({
      ...draftCatalog,
      activo: !draftCatalog.activo,
    });
  }

  return (
    <section className="catalogs-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Catalogos de activos</span>
          <div className="page-title-with-icon">
            <span className="page-title-icon">
              <AppIcon name="assets" size={22} strokeWidth={2.1} />
            </span>
            <h2>Catalogos de activos de informacion</h2>
          </div>
          <p className="page-copy">
            Administre los dominios controlados que alimentan el inventario de activos de
            informacion: tipo, nivel, ambiente, clasificacion, visibilidad, fuente e impacto.
          </p>
          <p className="permission-hint">
            Rol actual: <strong>{roleCapabilities.label}</strong>. Solo administracion puede crear,
            editar o deshabilitar catalogos de activos.
          </p>
        </div>

        <div className="registry-header-actions">
          <Link to="/catalogos" className="button-secondary">
            Volver a catalogos
          </Link>
          {roleCapabilities.catalogs.create ? (
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                const emptyEntry = buildEmptyCatalogEntry();
                setDraftCatalog({ ...emptyEntry, dominio: ASSET_DOMAIN });
                setActiveCatalogId(emptyEntry.id);
              }}
            >
              Nuevo catalogo de activo
            </button>
          ) : null}
        </div>
      </header>

      <div className="org-toolbar panel">
        <label className="field">
          <span>Buscar por tipo, codigo o nombre</span>
          <input
            className="input"
            placeholder="Ej. BASE_DATOS, clasificacion, impacto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Tipo</span>
          <select
            className="input"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
          >
            <option value="Todos">Todos</option>
            {typeOptions.map((item) => (
              <option key={item} value={item}>
                {formatCatalogTypeLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Estado</span>
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "Todos" | CatalogStatus)}
          >
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>
      </div>

      {catalogosQuery.isError ? (
        <section className="panel access-panel">
          <span className="brand-kicker">Sin conexion de catalogos</span>
          <h3>Catalogos de activos no disponibles</h3>
          <p className="page-copy">
            No fue posible consultar los catalogos de activos desde el backend. Revise la API
            antes de administrar los dominios del inventario.
          </p>
        </section>
      ) : null}

      <section className="panel org-admin-single">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">Activos de informacion</span>
            <h3>Catalogos articulados al inventario</h3>
          </div>
          <span className="pill">{filteredEntries.length} registros filtrados</span>
        </div>

        <TableScrollFrame className="table-wrapper-matrix" maxHeight="69vh">
          <table className="registry-table org-admin-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Codigo</th>
                <th>Nombre</th>
                <th>Descripcion</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredEntries.map((entry) => {
                const isSelected = activeCatalog?.id === entry.id;

                return (
                  <tr
                    key={entry.id}
                    className={
                      isSelected
                        ? "table-row-selected table-row-interactive"
                        : "table-row-interactive"
                    }
                    tabIndex={0}
                    aria-selected={isSelected}
                    aria-haspopup="dialog"
                    onClick={() => openCatalog(entry)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openCatalog(entry);
                      }
                    }}
                  >
                    <td>{formatCatalogTypeLabel(entry.tipo)}</td>
                    <td>
                      <strong>{entry.codigo}</strong>
                    </td>
                    <td>
                      <strong>{entry.nombre}</strong>
                    </td>
                    <td>{entry.descripcion || "Sin descripcion registrada"}</td>
                    <td>
                      <span
                        className={
                          entry.activo
                            ? "pill status-pill-vigente"
                            : "pill status-pill-archivado"
                        }
                      >
                        {getCatalogStatus(entry)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScrollFrame>
      </section>

      {activeCatalog && draftCatalog ? (
        <AssetCatalogManagementModal
          canSave={roleCapabilities.catalogs.save}
          canUpdate={roleCapabilities.catalogs.update}
          canUpdateStatus={roleCapabilities.catalogs.updateStatus}
          catalog={draftCatalog}
          isSaving={saveCatalogMutation.isPending}
          onChange={setDraftCatalog}
          onClose={() => {
            setActiveCatalogId(null);
            setDraftCatalog(null);
          }}
          onSave={handleSaveCatalog}
          onToggleStatus={handleToggleStatus}
        />
      ) : null}
    </section>
  );
}

function AssetCatalogManagementModal({
  canSave,
  canUpdate,
  canUpdateStatus,
  catalog,
  isSaving,
  onChange,
  onClose,
  onSave,
  onToggleStatus,
}: {
  canSave: boolean;
  canUpdate: boolean;
  canUpdateStatus: boolean;
  catalog: CatalogEntry;
  isSaving: boolean;
  onChange: (catalog: CatalogEntry) => void;
  onClose: () => void;
  onSave: () => void;
  onToggleStatus: () => void;
}) {
  return (
    <div
      className="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-catalog-management-title"
    >
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar catalogo de activo"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog catalog-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Catalogos de activos</span>
            <div className="page-title-with-icon page-title-with-icon-modal">
              <span className="page-title-icon">
                <AppIcon name="assets" size={20} strokeWidth={2.1} />
              </span>
              <h3 id="asset-catalog-management-title">
                {catalog.nombre || "Nuevo catalogo de activo"}
              </h3>
            </div>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <div className="catalog-modal-grid">
            <div className="detail-block">
              <h4>Edicion del catalogo de activo</h4>
              <div className="catalog-form-grid">
                <label className="field">
                  <span>Tipo</span>
                  <input
                    className="input"
                    value={catalog.tipo}
                    onChange={(event) => onChange({ ...catalog, tipo: event.target.value })}
                    disabled={!canUpdate}
                  />
                </label>

                <label className="field">
                  <span>Dominio</span>
                  <input className="input" value="Activos" disabled />
                </label>

                <label className="field">
                  <span>Codigo</span>
                  <input
                    className="input"
                    value={catalog.codigo}
                    onChange={(event) =>
                      onChange({ ...catalog, codigo: event.target.value.toUpperCase() })
                    }
                    disabled={!canUpdate}
                  />
                </label>

                <label className="field full-width">
                  <span>Nombre</span>
                  <input
                    className="input"
                    value={catalog.nombre}
                    onChange={(event) => onChange({ ...catalog, nombre: event.target.value })}
                    disabled={!canUpdate}
                  />
                </label>

                <label className="field full-width">
                  <span>Descripcion</span>
                  <textarea
                    className="input textarea"
                    rows={4}
                    value={catalog.descripcion}
                    onChange={(event) => onChange({ ...catalog, descripcion: event.target.value })}
                    disabled={!canUpdate}
                  />
                </label>
              </div>

              <div className="activity-action-modal-actions">
                {canUpdateStatus ? (
                  <button
                    type="button"
                    className={
                      catalog.activo
                        ? "button-table-action button-table-action-danger"
                        : "button-table-action"
                    }
                    onClick={onToggleStatus}
                  >
                    {catalog.activo ? "Deshabilitar" : "Habilitar"}
                  </button>
                ) : null}
                {canSave ? (
                  <button
                    type="button"
                    className="button-table-action"
                    disabled={isSaving}
                    onClick={onSave}
                  >
                    {isSaving ? "Guardando..." : "Guardar catalogo"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
