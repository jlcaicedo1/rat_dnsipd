import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getActivityTraceability,
  getActivityRegistryRecords,
  getDependenciaOptions,
  getRiskOptions,
  getRatStatusOptions,
  type ActivityRegistryRecord,
} from "../rat/rat-registry-data";
import { ActivityRelationshipGraph } from "./ActivityRelationshipGraph";

export function ActivitiesPage() {
  const activityRecords = getActivityRegistryRecords();
  const dependenciaOptions = getDependenciaOptions();
  const riskOptions = getRiskOptions();
  const statusOptions = getRatStatusOptions();

  const [search, setSearch] = useState("");
  const [dependencia, setDependencia] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [riesgo, setRiesgo] = useState("Todos");
  const [eipd, setEipd] = useState("Todos");
  const [viewMode, setViewMode] = useState<"operativa" | "grafo">("operativa");
  const [selectedActivityId, setSelectedActivityId] = useState<number>(
    activityRecords[0]?.id ?? 0,
  );

  const filteredActivities = activityRecords.filter((activity) => {
    const matchesSearch =
      search.trim().length === 0 ||
      [
        activity.codigo,
        activity.nombre,
        activity.ratCodigo,
        activity.dependencia,
        activity.unidadEjecutora,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesDependencia = dependencia === "Todas" || activity.dependencia === dependencia;
    const matchesEstado = estado === "Todos" || activity.estado === estado;
    const matchesRiesgo = riesgo === "Todos" || activity.riesgo === riesgo;
    const matchesEipd =
      eipd === "Todos" ||
      (eipd === "Si" ? activity.requiereEipd : !activity.requiereEipd);

    return matchesSearch && matchesDependencia && matchesEstado && matchesRiesgo && matchesEipd;
  });

  const selectedActivity =
    filteredActivities.find((item) => item.id === selectedActivityId) ??
    filteredActivities[0] ??
    null;
  const selectedTraceability = selectedActivity
    ? getActivityTraceability(selectedActivity.id)
    : null;

  useEffect(() => {
    if (selectedActivity && selectedActivity.id !== selectedActivityId) {
      setSelectedActivityId(selectedActivity.id);
    }
  }, [selectedActivity, selectedActivityId]);

  const stats = [
    { label: "Actividades", value: String(activityRecords.length) },
    {
      label: "En revision",
      value: String(activityRecords.filter((item) => item.estado === "En revision").length),
    },
    {
      label: "Alto riesgo",
      value: String(activityRecords.filter((item) => item.riesgo === "Alto").length),
    },
    {
      label: "Con EIPD",
      value: String(activityRecords.filter((item) => item.requiereEipd).length),
    },
  ];

  const activityMatrix = (
    <section
      className={
        viewMode === "operativa"
          ? "panel activities-list-pane activities-list-pane-expanded"
          : "panel activities-list-pane"
      }
    >
      <div className="panel-heading">
        <div>
          <span className="brand-kicker">
            {viewMode === "operativa" ? "Trabajo por actividad" : "Trazabilidad y analitica"}
          </span>
          <h3>
            {viewMode === "operativa"
              ? "Matriz operativa institucional"
              : "Selecciona una actividad para revisar su articulacion"}
          </h3>
        </div>
        <span className="pill">{filteredActivities.length} visibles</span>
      </div>

      <div className="activities-filters">
        <label className="field">
          <span>Buscar</span>
          <input
            className="input"
            placeholder="Actividad, RAT, dependencia"
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
          <select className="input" value={estado} onChange={(event) => setEstado(event.target.value)}>
            <option value="Todos">Todos</option>
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Riesgo</span>
          <select className="input" value={riesgo} onChange={(event) => setRiesgo(event.target.value)}>
            <option value="Todos">Todos</option>
            {riskOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>EIPD</span>
          <select className="input" value={eipd} onChange={(event) => setEipd(event.target.value)}>
            <option value="Todos">Todos</option>
            <option value="Si">Si</option>
            <option value="No">No</option>
          </select>
        </label>
      </div>

      {filteredActivities.length > 0 ? (
        <div className="table-wrapper table-wrapper-matrix">
          <table
            className={
              viewMode === "operativa"
                ? "registry-table registry-table-activities"
                : "registry-table registry-table-activities registry-table-activities-graph"
            }
          >
            <thead>
              <tr>
                <th>Actividad</th>
                <th>RAT</th>
                {viewMode === "operativa" ? <th>Dependencia</th> : null}
                <th>Finalidad</th>
                <th>Unidad ejecutora</th>
                <th>Estado</th>
                <th>Riesgo</th>
                <th>EIPD</th>
                <th>Version</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.map((activity) => (
                <tr
                  key={activity.id}
                  className={selectedActivity?.id === activity.id ? "table-row-selected" : undefined}
                  onClick={() => setSelectedActivityId(activity.id)}
                >
                  <td>
                    <div className="table-primary-copy">
                      <strong>{activity.codigo}</strong>
                      <small>{activity.nombre}</small>
                    </div>
                  </td>
                  <td>
                    <div className="table-primary-copy">
                      <strong>{activity.ratCodigo}</strong>
                      <small>{activity.ratNombre}</small>
                    </div>
                  </td>
                  {viewMode === "operativa" ? <td>{activity.dependencia}</td> : null}
                  <td className="table-purpose-cell">
                    {shortenCopy(activity.report.finalidadEspecifica, viewMode === "grafo" ? 110 : 140)}
                  </td>
                  <td>{activity.unidadEjecutora}</td>
                  <td>
                    <StatusBadge value={activity.estado} />
                  </td>
                  <td>
                    <RiskBadge value={activity.riesgo} />
                  </td>
                  <td>
                    <EipdBadge value={activity.requiereEipd} />
                  </td>
                  <td>{activity.version}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">No hay actividades disponibles con los filtros seleccionados.</div>
      )}
    </section>
  );

  return (
    <section className="activities-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Bandeja operativa</span>
          <h2>Actividades de tratamiento</h2>
          <p className="page-copy">
            Esta vista no duplica al RAT. Aqui se trabaja por actividad: seguimiento
            operativo, inteligencia del tratamiento y trazabilidad accionable ante incidente.
          </p>
        </div>

        <div className="registry-header-actions">
          <div className="segmented-switch" role="tablist" aria-label="Modo de vista">
            <button
              type="button"
              className={viewMode === "operativa" ? "segmented-switch-active" : undefined}
              onClick={() => setViewMode("operativa")}
            >
              Bandeja operativa
            </button>
            <button
              type="button"
              className={viewMode === "grafo" ? "segmented-switch-active" : undefined}
              onClick={() => setViewMode("grafo")}
            >
              Mapa de relaciones
            </button>
          </div>

          <Link to="/rats" className="button-secondary">
            Ir a Registro RAT
          </Link>
        </div>
      </header>

      {viewMode === "operativa" ? (
        <div className="summary-grid">
          {stats.map((item) => (
            <article key={item.label} className="stat-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      ) : null}

      {viewMode === "operativa" ? (
        activityMatrix
      ) : (
        <div className="activities-shell activities-shell-graph">
          {activityMatrix}

          <aside className="panel activities-side-pane">
            {selectedActivity && selectedTraceability ? (
              <ActivityRelationshipGraph
                activity={selectedActivity}
                traceability={selectedTraceability}
              />
            ) : (
              <div className="empty-state">
                No hay actividades disponibles con los filtros seleccionados.
              </div>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}

function StatusBadge({ value }: { value: ActivityRegistryRecord["estado"] }) {
  return <span className={`pill status-pill-${normalizeToken(value)}`}>{value}</span>;
}

function RiskBadge({ value }: { value: ActivityRegistryRecord["riesgo"] }) {
  return <span className={`pill risk-pill-${normalizeToken(value)}`}>{value}</span>;
}

function EipdBadge({ value }: { value: boolean }) {
  return (
    <span className={value ? "pill eipd-pill-yes" : "pill eipd-pill-no"}>
      {value ? "Si" : "No"}
    </span>
  );
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function shortenCopy(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}
