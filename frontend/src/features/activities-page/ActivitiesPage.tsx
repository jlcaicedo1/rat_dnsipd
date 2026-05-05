import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ExecutiveKpiGrid, type ExecutiveKpiItem } from "../../components/ExecutiveKpiGrid";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import {
  defaultSignatureFields,
  getActivityTraceability,
  getRatRegistryRecords,
  getRiskOptions,
  getRatStatusOptions,
  type ActivityRegistryRecord,
  type SignatureFieldState,
} from "../rat/rat-registry-data";
import {
  buildRegistryWorkspace,
  persistActivityStatus,
} from "../rat/registry-workspace";
import { ReportPreviewModal } from "../rat/ReportPreviewModal";
import {
  buildReportPreviewDocument,
  printReportPreviewDocument,
} from "../rat/TreatmentReportPreview";
import { seedTreatmentDraftFromActivity } from "../rat/treatment-draft-storage";
import { ActivityMapModal } from "./ActivityMapModal";

export function ActivitiesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const ratRecords = useMemo(() => buildRegistryWorkspace(getRatRegistryRecords()), [workspaceVersion]);
  const activityRecords = useMemo(
    () => ratRecords.flatMap((rat) => rat.activities),
    [ratRecords],
  );
  const dependenciaOptions = useMemo(
    () => Array.from(new Set(activityRecords.map((item) => item.dependencia))).sort(),
    [activityRecords],
  );
  const riskOptions = getRiskOptions();
  const statusOptions = getRatStatusOptions();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dependencia, setDependencia] = useState(() => searchParams.get("dependencia") ?? "Todas");
  const [estado, setEstado] = useState(() => searchParams.get("estado") ?? "Todos");
  const [riesgo, setRiesgo] = useState(() => searchParams.get("riesgo") ?? "Todos");
  const [eipd, setEipd] = useState(() => searchParams.get("eipd") ?? "Todos");
  const [activeActivityId, setActiveActivityId] = useState<number | null>(null);
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

  const activeActivity =
    activityRecords.find((item) => item.id === activeActivityId) ?? null;

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setDependencia(searchParams.get("dependencia") ?? "Todas");
    setEstado(searchParams.get("estado") ?? "Todos");
    setRiesgo(searchParams.get("riesgo") ?? "Todos");
    setEipd(searchParams.get("eipd") ?? "Todos");
  }, [searchParams]);

  useEffect(() => {
    if (activeActivityId === null) {
      return;
    }

    if (!activityRecords.some((item) => item.id === activeActivityId)) {
      setActiveActivityId(null);
    }
  }, [activityRecords, activeActivityId]);

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

  const isAnyModalOpen =
    previewActivityId !== null || relationshipActivityId !== null || activeActivityId !== null;

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
        setActiveActivityId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAnyModalOpen]);

  const stats = useMemo<ExecutiveKpiItem[]>(
    () => [
      {
        label: "Total actividades",
        value: activityRecords.length,
        tone: "neutral",
      },
      {
        label: "Borrador",
        value: activityRecords.filter((item) => item.estado === "Borrador").length,
        tone:
          activityRecords.some((item) => item.estado === "Borrador") ? "neutral" : "success",
      },
      {
        label: "En revision",
        value: activityRecords.filter((item) => item.estado === "En revision").length,
        tone:
          activityRecords.some((item) => item.estado === "En revision") ? "warning" : "success",
      },
      {
        label: "Vigentes",
        value: activityRecords.filter((item) => item.estado === "Vigente").length,
        tone: "success",
      },
    ],
    [activityRecords],
  );

  function handlePrepareTreatment(activity: ActivityRegistryRecord, mode: "edit" | "duplicate") {
    seedTreatmentDraftFromActivity(activity, mode);
    navigate(`/actividades/nuevo?mode=${mode}&source=${activity.id}`);
  }

  function handleActivityStatusChange(activity: ActivityRegistryRecord) {
    const nextStatus = getNextActivityStatus(activity.estado, roleCapabilities.activities.approve);
    persistActivityStatus(activity.id, nextStatus);
    setWorkspaceVersion((current) => current + 1);
  }

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
          <p className="permission-hint">
            Rol actual: <strong>{roleCapabilities.label}</strong>.{" "}
            {roleCapabilities.activities.update
              ? "Puede crear, editar y duplicar tratamientos."
              : "Puede consultar, revisar y formalizar segun el flujo de aprobacion."}
          </p>
        </div>

        <div className="activities-header-actions">
          <div className="activities-header-buttons">
            <Link to="/activos" className="button-secondary">
              Ver activos
            </Link>
            {roleCapabilities.activities.create ? (
              <Link to="/actividades/nuevo" className="button-primary">
                Nuevo tratamiento
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <ExecutiveKpiGrid items={stats} />

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
          <TableScrollFrame className="table-wrapper-matrix" maxHeight="none">
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
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => {
                  const isSelected = activeActivity?.id === activity.id;

                  return (
                  <tr
                    key={activity.id}
                    className={isSelected ? "table-row-selected table-row-interactive" : "table-row-interactive"}
                    tabIndex={0}
                    aria-selected={isSelected}
                    aria-haspopup="dialog"
                    onClick={() => setActiveActivityId(activity.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveActivityId(activity.id);
                      }
                    }}
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
                  </tr>
                )})}
              </tbody>
            </table>
          </TableScrollFrame>
        ) : (
          <div className="empty-state">No hay actividades disponibles con los filtros seleccionados.</div>
        )}
      </section>

      {previewActivity ? (
        <ReportPreviewModal
          activity={previewActivity}
          heading={`Registro de actividad · ${previewActivity.codigo}`}
          isOpen
          onClose={() => setPreviewActivityId(null)}
          onDownload={() => {
            const surfaceMarkup = previewSurfaceRef.current?.innerHTML;

            if (!surfaceMarkup || typeof document === "undefined") {
              return;
            }

            const documentHtml = buildReportPreviewDocument(
              `Registro ${previewActivity.codigo}`,
              surfaceMarkup,
            );
            const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = objectUrl;
            link.download = `${previewActivity.codigo}-${slugify(previewActivity.nombre)}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
          }}
          onPrint={() => {
            const surfaceMarkup = previewSurfaceRef.current?.innerHTML;

            if (!surfaceMarkup) {
              return;
            }

            printReportPreviewDocument(`Registro ${previewActivity.codigo}`, surfaceMarkup);
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

      {activeActivity ? (
        <ActivityActionModal
          activity={activeActivity}
          canApprove={roleCapabilities.activities.approve}
          canArchive={roleCapabilities.activities.archive}
          canDuplicate={roleCapabilities.activities.duplicate}
          canUpdate={roleCapabilities.activities.update}
          onArchive={() => {
            persistActivityStatus(activeActivity.id, "Archivado");
            setWorkspaceVersion((current) => current + 1);
          }}
          onChangeStatus={() => handleActivityStatusChange(activeActivity)}
          onClose={() => setActiveActivityId(null)}
          onDuplicate={() => handlePrepareTreatment(activeActivity, "duplicate")}
          onEdit={() => handlePrepareTreatment(activeActivity, "edit")}
          onOpenMap={() => {
            setActiveActivityId(null);
            setRelationshipActivityId(activeActivity.id);
          }}
          onOpenPreview={() => {
            setActiveActivityId(null);
            setPreviewActivityId(activeActivity.id);
          }}
        />
      ) : null}
    </section>
  );
}

function ActivityActionModal({
  activity,
  canApprove,
  canArchive,
  canDuplicate,
  canUpdate,
  onArchive,
  onChangeStatus,
  onClose,
  onDuplicate,
  onEdit,
  onOpenMap,
  onOpenPreview,
}: {
  activity: ActivityRegistryRecord;
  canApprove: boolean;
  canArchive: boolean;
  canDuplicate: boolean;
  canUpdate: boolean;
  onArchive: () => void;
  onChangeStatus: () => void;
  onClose: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onOpenMap: () => void;
  onOpenPreview: () => void;
}) {
  return (
    <div className="report-preview-modal" role="dialog" aria-modal="true" aria-labelledby="activity-action-title">
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar gestion del tratamiento"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog activity-action-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Gestion del registro</span>
            <h3 id="activity-action-title">
              {activity.codigo} · {activity.nombre}
            </h3>
            <p className="page-copy">
              Revise el contexto del tratamiento y ejecute la accion que corresponda sin salir de la vista.
            </p>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <div className="activity-action-modal-grid">
            <div className="detail-block">
              <h4>Contexto del tratamiento</h4>
              <dl className="detail-grid">
                <div>
                  <dt>RAT asociado</dt>
                  <dd>{activity.ratCodigo}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{activity.version}</dd>
                </div>
                <div>
                  <dt>Dependencia</dt>
                  <dd>{activity.dependencia}</dd>
                </div>
                <div>
                  <dt>Unidad ejecutora</dt>
                  <dd>{activity.unidadEjecutora}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <StatusBadge value={activity.estado} />
                  </dd>
                </div>
                <div>
                  <dt>Riesgo</dt>
                  <dd>
                    <RiskBadge value={activity.riesgo} />
                  </dd>
                </div>
                <div>
                  <dt>EIPD</dt>
                  <dd>
                    <EipdBadge value={activity.requiereEipd} />
                  </dd>
                </div>
                <div className="detail-span">
                  <dt>Finalidad</dt>
                  <dd>{activity.report.finalidadEspecifica}</dd>
                </div>
              </dl>
            </div>

            <div className="detail-block">
              <h4>Acciones disponibles</h4>
              <div className="activity-action-modal-actions">
                {canUpdate ? (
                  <button type="button" className="button-table-action" onClick={onEdit}>
                    Editar
                  </button>
                ) : null}
                {canDuplicate ? (
                  <button
                    type="button"
                    className="button-table-action button-table-action-secondary"
                    onClick={onDuplicate}
                  >
                    Duplicar
                  </button>
                ) : null}
                {canUpdate || canApprove ? (
                  <button
                    type="button"
                    className="button-table-action button-table-action-secondary"
                    onClick={onChangeStatus}
                  >
                    {getActivityLifecycleLabel(activity.estado, canApprove)}
                  </button>
                ) : null}
                {canArchive && activity.estado !== "Archivado" ? (
                  <button
                    type="button"
                    className="button-table-action button-table-action-danger"
                    onClick={onArchive}
                  >
                    Archivar
                  </button>
                ) : null}
                <button type="button" className="button-table-action" onClick={onOpenPreview}>
                  Vista previa
                </button>
                <button
                  type="button"
                  className="button-table-action button-table-action-secondary"
                  onClick={onOpenMap}
                >
                  Mapa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getNextActivityStatus(
  currentStatus: ActivityRegistryRecord["estado"],
  canApprove: boolean,
): ActivityRegistryRecord["estado"] {
  if (currentStatus === "Borrador") {
    return "En revision";
  }

  if (currentStatus === "En revision") {
    return canApprove ? "Vigente" : "Borrador";
  }

  if (currentStatus === "Archivado") {
    return "En revision";
  }

  return "En revision";
}

function getActivityLifecycleLabel(
  currentStatus: ActivityRegistryRecord["estado"],
  canApprove: boolean,
) {
  if (currentStatus === "Borrador") {
    return "Enviar revision";
  }

  if (currentStatus === "En revision") {
    return canApprove ? "Publicar" : "Devolver borrador";
  }

  if (currentStatus === "Archivado") {
    return "Reactivar";
  }

  return "Reabrir";
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
