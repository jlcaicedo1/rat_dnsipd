import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExecutiveKpiGrid, type ExecutiveKpiItem } from "../../components/ExecutiveKpiGrid";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";

type BackendRat = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estadoGeneral: string;
  dependencia: { id: number; nombre: string; sigla: string | null };
  subdireccion: { id: number; nombre: string } | null;
  versionActual: string | null;
  totalActividades: number;
};

type BackendActivity = {
  id: number;
  ratId: number;
  codigo: string;
  nombre: string;
  ratCodigo: string;
  rat: string;
  dependencia: string;
  subdireccion: string | null;
  estadoGeneral: string;
  estadoVersionActual: string | null;
  versionActualId: number | null;
  versionActual: string | null;
  finalidad: string | null;
  plazoConservacion: string | null;
  baseLicitud: string | null;
  normaAplicable: string | null;
  categoriasDatos: unknown;
  categoriasTitulares: string | null;
  accionesTratamiento: unknown;
  origenDatos: string | null;
  medidaSeguridad: string | null;
  requiereEipd: boolean;
  fechaLevantamiento: string | null;
};

function mapEstadoDisplay(raw: string): string {
  const s = raw.toUpperCase();
  if (s === "VIGENTE") return "Vigente";
  if (s === "EN_REVISION") return "En revision";
  if (s === "ARCHIVADO") return "Archivado";
  return "Borrador";
}

const statusOptions = ["Borrador", "En revision", "Vigente", "Archivado"];

export function RatListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);

  const ratsQuery = useQuery({
    queryKey: ["rats", "list"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: BackendRat[] }>("/rats");
      return response.data.data;
    },
  });

  const activitiesQuery = useQuery({
    queryKey: ["actividades-backend"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: BackendActivity[]; archivedCodigos: string[] }>("/actividades");
      return response.data;
    },
    staleTime: 30_000,
  });

  const rats = ratsQuery.data ?? [];
  const allActivities = activitiesQuery.data?.data ?? [];

  const activitiesByRatId = useMemo(() => {
    const map = new Map<number, BackendActivity[]>();
    for (const act of allActivities) {
      if (!map.has(act.ratId)) map.set(act.ratId, []);
      map.get(act.ratId)!.push(act);
    }
    return map;
  }, [allActivities]);

  const dependenciaOptions = useMemo(
    () => Array.from(new Set(rats.map((r) => r.dependencia.nombre))).sort(),
    [rats],
  );

  const [search, setSearch] = useState("");
  const [dependencia, setDependencia] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [selectedRatId, setSelectedRatId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);

  const filteredRats = rats.filter((rat) => {
    const matchesSearch =
      search.trim().length === 0 ||
      [rat.codigo, rat.nombre, rat.dependencia.nombre, rat.dependencia.sigla ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesDependencia =
      dependencia === "Todas" || rat.dependencia.nombre === dependencia;
    const matchesEstado =
      estado === "Todos" || mapEstadoDisplay(rat.estadoGeneral) === estado;
    return matchesSearch && matchesDependencia && matchesEstado;
  });

  const selectedRat = filteredRats.find((r) => r.id === selectedRatId) ?? null;
  const selectedRatActivities = selectedRat
    ? (activitiesByRatId.get(selectedRat.id) ?? [])
    : [];
  const selectedActivity =
    selectedRatActivities.find((a) => a.id === selectedActivityId) ?? null;

  useEffect(() => {
    if (selectedRatId === null) {
      return;
    }
    if (!filteredRats.some((item) => item.id === selectedRatId)) {
      setSelectedRatId(null);
      setSelectedActivityId(null);
    }
  }, [filteredRats, selectedRatId]);

  useEffect(() => {
    if (!selectedRat) {
      return;
    }
    const acts = activitiesByRatId.get(selectedRat.id) ?? [];
    if (!acts.some((item) => item.id === selectedActivityId)) {
      setSelectedActivityId(acts[0]?.id ?? null);
    }
  }, [selectedActivityId, selectedRat, activitiesByRatId]);

  const stats = useMemo<ExecutiveKpiItem[]>(() => {
    const vigentes = rats.filter((r) => r.estadoGeneral === "VIGENTE").length;
    const enRevision = rats.filter((r) => r.estadoGeneral === "EN_REVISION").length;
    const archivados = rats.filter((r) => r.estadoGeneral === "ARCHIVADO").length;

    return [
      {
        label: "RAT registrados",
        value: rats.length,
        icon: "formalization" as const,
        tone: "neutral",
      },
      {
        label: "Vigentes",
        value: vigentes,
        icon: "checklist" as const,
        tone: vigentes > 0 ? "success" : "neutral",
      },
      {
        label: "En revision",
        value: enRevision,
        icon: "audit" as const,
        tone: enRevision > 0 ? "warning" : "neutral",
      },
      {
        label: "Archivados",
        value: archivados,
        icon: "reports" as const,
        tone: "neutral",
      },
    ];
  }, [rats]);

  return (
    <section className="registry-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Consola maestra</span>
          <h2>Registro RAT</h2>
          <p className="page-copy">
            Aqui debe vivir el inventario formal de RAT: estado, riesgo, EIPD, actividades
            asociadas y ficha imprimible de aprobacion.
          </p>
          <p className="permission-hint">
            Rol actual: <strong>{roleCapabilities.label}</strong>.{" "}
            {roleCapabilities.rats.version
              ? "Puede versionar y archivar RAT institucionales."
              : "Puede consultar la ficha y, si corresponde, volver al tratamiento base."}
          </p>
        </div>

        <div className="registry-header-actions">
          {roleCapabilities.activities.create ? (
            <Link to="/actividades/nuevo" className="button-primary">
              Nuevo tratamiento base
            </Link>
          ) : null}
        </div>
      </header>

      <ExecutiveKpiGrid items={stats} />

      <div className="registry-shell">
        <section className="panel registry-list-pane">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">Listado institucional</span>
              <h3>RAT por dependencia</h3>
            </div>
            <span className="pill">{filteredRats.length} visibles</span>
          </div>

          <div className="registry-filters">
            <label className="field">
              <span>Buscar</span>
              <input
                className="input"
                placeholder="Codigo, nombre o dependencia"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Dependencia</span>
              <select
                className="input"
                value={dependencia}
                onChange={(event) => setDependencia(event.target.value)}
              >
                <option value="Todas">Todas</option>
                {dependenciaOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Estado</span>
              <select
                className="input"
                value={estado}
                onChange={(event) => setEstado(event.target.value)}
              >
                <option value="Todos">Todos</option>
                {statusOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className={
              selectedRat
                ? "selection-action-bar selection-action-bar-active"
                : "selection-action-bar"
            }
            aria-live="polite"
          >
            {selectedRat ? (
              <>
                <div className="selection-action-copy">
                  <span className="brand-kicker">RAT seleccionado</span>
                  <strong>
                    {selectedRat.codigo} · {selectedRat.nombre}
                  </strong>
                  <small>
                    {selectedRat.dependencia.nombre}
                    {selectedRat.subdireccion
                      ? ` · ${selectedRat.subdireccion.nombre}`
                      : ""}
                  </small>
                </div>

                <div className="selection-action-meta">
                  <span
                    className={`pill status-pill-${normalizeToken(
                      mapEstadoDisplay(selectedRat.estadoGeneral),
                    )}`}
                  >
                    {mapEstadoDisplay(selectedRat.estadoGeneral)}
                  </span>
                </div>
              </>
            ) : (
              <p className="selection-action-empty">
                Seleccione un RAT para ver sus actividades y acceder a los tratamientos.
              </p>
            )}
          </div>

          {ratsQuery.isLoading ? (
            <div className="empty-state">Cargando RAT...</div>
          ) : (
            <TableScrollFrame className="table-wrapper-matrix" maxHeight="64vh">
              <table className="registry-table registry-table-rats">
                <thead>
                  <tr>
                    <th>Codigo RAT</th>
                    <th>Registro</th>
                    <th>Dependencia</th>
                    <th>Estado</th>
                    <th>Actividades</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRats.map((rat) => {
                    const isSelected = selectedRat?.id === rat.id;

                    return (
                      <tr
                        key={rat.id}
                        className={
                          isSelected
                            ? "table-row-selected table-row-interactive"
                            : "table-row-interactive"
                        }
                        tabIndex={0}
                        aria-selected={isSelected}
                        onClick={() => setSelectedRatId(rat.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setSelectedRatId(rat.id);
                          }
                        }}
                      >
                        <td>
                          <strong>{rat.codigo}</strong>
                        </td>
                        <td>
                          <div className="table-primary-copy">
                            <strong>{rat.nombre}</strong>
                            <small>{rat.descripcion ?? ""}</small>
                          </div>
                        </td>
                        <td>
                          <div className="table-primary-copy">
                            <strong>
                              {rat.dependencia.sigla ?? rat.dependencia.nombre}
                            </strong>
                            <small>{rat.dependencia.nombre}</small>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`pill status-pill-${normalizeToken(
                              mapEstadoDisplay(rat.estadoGeneral),
                            )}`}
                          >
                            {mapEstadoDisplay(rat.estadoGeneral)}
                          </span>
                        </td>
                        <td>{rat.totalActividades}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScrollFrame>
          )}

          {selectedRat ? (
            <section className="registry-activities-strip">
              <div className="panel-heading">
                <div>
                  <span className="brand-kicker">Actividades hijas</span>
                  <h3>{selectedRat.codigo}</h3>
                </div>
                <span className="pill">{selectedRatActivities.length} actividades</span>
              </div>

              <div className="activity-chip-row">
                {selectedRatActivities.map((activity) => {
                  const isSelected = selectedActivity?.id === activity.id;

                  return (
                    <button
                      key={activity.id}
                      type="button"
                      className={
                        isSelected
                          ? "activity-chip-card activity-chip-card-selected"
                          : "activity-chip-card"
                      }
                      onClick={() => setSelectedActivityId(activity.id)}
                    >
                      <strong>{activity.nombre}</strong>
                      <span>{activity.subdireccion ?? activity.dependencia}</span>
                      <div className="activity-chip-meta">
                        <span
                          className={`pill status-pill-${normalizeToken(
                            mapEstadoDisplay(
                              activity.estadoVersionActual ?? activity.estadoGeneral,
                            ),
                          )}`}
                        >
                          {mapEstadoDisplay(
                            activity.estadoVersionActual ?? activity.estadoGeneral,
                          )}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="empty-state">
              No hay RAT registrados con los filtros seleccionados.
            </div>
          )}
        </section>

        <aside className="panel registry-preview-pane">
          {selectedRat ? (
            <>
              <div className="registry-preview-summary">
                <div>
                  <span className="brand-kicker">Ficha RAT</span>
                  <h3>{selectedRat.codigo}</h3>
                  <p className="page-copy">{selectedRat.nombre}</p>
                </div>
                <div className="registry-preview-meta">
                  <span
                    className={`pill status-pill-${normalizeToken(
                      mapEstadoDisplay(selectedRat.estadoGeneral),
                    )}`}
                  >
                    {mapEstadoDisplay(selectedRat.estadoGeneral)}
                  </span>
                </div>
              </div>

              <div className="registry-document-grid">
                <article className="registry-document-card">
                  <span>Dependencia</span>
                  <strong>{selectedRat.dependencia.nombre}</strong>
                  <small>{selectedRat.dependencia.sigla ?? ""}</small>
                </article>
                {selectedRat.subdireccion ? (
                  <article className="registry-document-card">
                    <span>Subdireccion</span>
                    <strong>{selectedRat.subdireccion.nombre}</strong>
                  </article>
                ) : null}
                <article className="registry-document-card">
                  <span>Version actual</span>
                  <strong>{selectedRat.versionActual ?? "Sin version"}</strong>
                </article>
                <article className="registry-document-card">
                  <span>Actividades registradas</span>
                  <strong>{selectedRat.totalActividades}</strong>
                </article>
                {selectedActivity ? (
                  <article className="registry-document-card">
                    <span>Actividad seleccionada</span>
                    <strong>{selectedActivity.nombre}</strong>
                    <small>{selectedActivity.codigo}</small>
                  </article>
                ) : null}
              </div>

              <div className="registry-document-actions">
                <Link
                  to={`/actividades?q=${encodeURIComponent(selectedRat.codigo)}`}
                  className="button-secondary"
                >
                  Ver actividades
                </Link>
                {selectedActivity ? (
                  <button
                    type="button"
                    className="button-primary"
                    onClick={() =>
                      navigate(
                        `/actividades/nuevo?mode=edit&source=${selectedActivity.id}`,
                      )
                    }
                  >
                    Editar tratamiento
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <div className="empty-state">
              Seleccione un RAT y una actividad para ver la ficha del tratamiento.
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
