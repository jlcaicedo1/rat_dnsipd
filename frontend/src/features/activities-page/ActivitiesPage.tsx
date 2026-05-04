import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import {
  defaultSignatureFields,
  getActivityTraceability,
  getActivityRegistryRecords,
  getDependenciaOptions,
  getRiskOptions,
  getRatStatusOptions,
  type ActivityRegistryRecord,
  type SignatureFieldState,
} from "../rat/rat-registry-data";
import { ReportPreviewModal } from "../rat/ReportPreviewModal";
import { buildReportPreviewDocument } from "../rat/TreatmentReportPreview";
import { ActivityMapModal } from "./ActivityMapModal";

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
  const [previewActivityId, setPreviewActivityId] = useState<number | null>(null);
  const [relationshipActivityId, setRelationshipActivityId] = useState<number | null>(null);
  const previewSurfaceRef = useRef<HTMLDivElement>(null);

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

  const previewActivity =
    activityRecords.find((item) => item.id === previewActivityId) ?? null;
  const previewTraceability = previewActivity
    ? getActivityTraceability(previewActivity.id)
    : null;
  const previewSignatures = buildSignatureFields(previewActivity, previewTraceability);

  const relationshipActivity =
    activityRecords.find((item) => item.id === relationshipActivityId) ?? null;
  const relationshipTraceability = relationshipActivity
    ? getActivityTraceability(relationshipActivity.id)
    : null;

  const isAnyModalOpen = previewActivityId !== null || relationshipActivityId !== null;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (!isAnyModalOpen || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewActivityId(null);
        setRelationshipActivityId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAnyModalOpen]);

  const stats = useMemo(
    () => [
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
    ],
    [activityRecords],
  );

  return (
    <section className="activities-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Nucleo operativo</span>
          <h2>Actividades de tratamiento</h2>
          <p className="page-copy">
            Toda la gestion queda concentrada en una sola matriz: seguimiento,
            lectura documental y mapa relacional de cada tratamiento sin paneles paralelos.
          </p>
        </div>

        <div className="activities-header-actions">
          <div className="activities-header-buttons">
            <Link to="/activos" className="button-secondary">
              Ver activos
            </Link>
            <Link to="/actividades/nuevo" className="button-primary">
              Nuevo tratamiento
            </Link>
          </div>
        </div>
      </header>

      <div className="summary-grid">
        {stats.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel activities-matrix-panel">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">Matriz institucional centralizada</span>
            <h3>Listado consolidado por actividad</h3>
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
          <TableScrollFrame className="table-wrapper-matrix" maxHeight="68vh">
            <table className="registry-table registry-table-activities registry-table-activities-central">
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>RAT</th>
                  <th>Dependencia</th>
                  <th>Finalidad</th>
                  <th>Unidad ejecutora</th>
                  <th>Estado</th>
                  <th>Riesgo</th>
                  <th>EIPD</th>
                  <th>Version</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => (
                  <tr key={activity.id}>
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
                    <td>{activity.dependencia}</td>
                    <td className="table-purpose-cell">
                      {shortenCopy(activity.report.finalidadEspecifica, 148)}
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
                    <td className="table-actions-cell">
                      <div className="table-action-group">
                        <button
                          type="button"
                          className="button-table-action"
                          onClick={() => setPreviewActivityId(activity.id)}
                        >
                          Vista previa
                        </button>
                        <button
                          type="button"
                          className="button-table-action button-table-action-secondary"
                          onClick={() => setRelationshipActivityId(activity.id)}
                        >
                          Mapa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollFrame>
        ) : (
          <div className="empty-state">No hay actividades disponibles con los filtros seleccionados.</div>
        )}
      </section>

      {previewActivity ? (
        <ReportPreviewModal
          heading={`Ficha del tratamiento · ${previewActivity.nombre}`}
          isOpen
          onClose={() => setPreviewActivityId(null)}
          onDownload={() => {
            const surfaceMarkup = previewSurfaceRef.current?.innerHTML;

            if (!surfaceMarkup || typeof document === "undefined") {
              return;
            }

            const documentHtml = buildReportPreviewDocument(
              `Ficha ${previewActivity.report.codigoRat}`,
              surfaceMarkup,
            );
            const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = objectUrl;
            link.download = `${previewActivity.report.codigoRat}-${slugify(previewActivity.nombre)}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
          }}
          onPrint={() => {
            if (typeof window !== "undefined") {
              window.print();
            }
          }}
          report={previewActivity.report}
          signatures={previewSignatures}
          surfaceRef={previewSurfaceRef}
        />
      ) : null}

      {relationshipActivity && relationshipTraceability ? (
        <ActivityMapModal
          activity={relationshipActivity}
          isOpen
          onClose={() => setRelationshipActivityId(null)}
          traceability={relationshipTraceability}
        />
      ) : null}
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

function buildSignatureFields(
  activity: ActivityRegistryRecord | null,
  traceability: ReturnType<typeof getActivityTraceability> | null,
): SignatureFieldState {
  if (!activity) {
    return defaultSignatureFields;
  }

  return {
    elaboradoPorNombre:
      traceability?.owner.nombre ?? defaultSignatureFields.elaboradoPorNombre,
    elaboradoPorCargo:
      traceability?.owner.cargo ?? defaultSignatureFields.elaboradoPorCargo,
    responsableNombre: activity.responsables[0] ?? defaultSignatureFields.responsableNombre,
    responsableCargo: activity.unidadEjecutora || defaultSignatureFields.responsableCargo,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
