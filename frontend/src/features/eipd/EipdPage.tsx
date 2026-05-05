import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ExecutiveKpiGrid,
  type ExecutiveKpiItem,
} from "../../components/ExecutiveKpiGrid";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import { buildRegistryWorkspace } from "../rat/registry-workspace";
import {
  getActivityTraceability,
  getRatRegistryRecords,
  type ActivityRegistryRecord,
} from "../rat/rat-registry-data";

type EipdEvaluationStatus =
  | "Pre-evaluacion"
  | "En elaboracion"
  | "En revision DPD"
  | "Consulta previa"
  | "Aprobada"
  | "Vigente";

type EipdWorkspaceRecord = {
  estado: EipdEvaluationStatus;
  requiereConsultaPrevia: boolean;
  conclusion: string;
  fechaProximaRevision: string;
  ultimaActualizacion: string;
};

type EipdCaseRecord = {
  activityId: number;
  codigoEipd: string;
  ratCodigo: string;
  actividadCodigo: string;
  actividadNombre: string;
  dependencia: string;
  dependenciaEjecutora: string;
  estadoActividad: ActivityRegistryRecord["estado"];
  estadoEipd: EipdEvaluationStatus;
  riesgo: ActivityRegistryRecord["riesgo"];
  requiereConsultaPrevia: boolean;
  conclusion: string;
  fechaProximaRevision: string;
  ultimaActualizacion: string;
  report: ActivityRegistryRecord["report"];
  criterios: Array<{ label: string; applies: boolean }>;
  riesgosTitulares: string[];
  medidasMitigacion: string[];
};

const EIPD_WORKSPACE_STORAGE_KEY = "rat_dnsipd_eipd_workspace";

const DEFAULT_EIPD_CASES: Record<number, EipdWorkspaceRecord> = {
  201: {
    estado: "En elaboracion",
    requiereConsultaPrevia: false,
    conclusion:
      "La actividad trata datos de salud y requiere documentar necesidad, proporcionalidad y medidas reforzadas antes de su cierre.",
    fechaProximaRevision: "2026-05-20",
    ultimaActualizacion: "2026-04-23",
  },
  202: {
    estado: "En revision DPD",
    requiereConsultaPrevia: false,
    conclusion:
      "La reutilizacion analitica de datos de salud exige validar minimizacion, seudonimizacion y gobierno del uso secundario.",
    fechaProximaRevision: "2026-05-18",
    ultimaActualizacion: "2026-04-24",
  },
  501: {
    estado: "Consulta previa",
    requiereConsultaPrevia: true,
    conclusion:
      "El expediente juridico incluye datos sensibles y anexos probatorios que justifican criterio reforzado y consulta previa antes de su vigencia.",
    fechaProximaRevision: "2026-05-12",
    ultimaActualizacion: "2026-04-25",
  },
};

export function EipdPage() {
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const [searchParams] = useSearchParams();
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dependencia, setDependencia] = useState(
    () => searchParams.get("dependencia") ?? "Todas",
  );
  const [estado, setEstado] = useState(
    () => searchParams.get("estado") ?? "Todos",
  );
  const [consulta, setConsulta] = useState(
    () => searchParams.get("consulta") ?? "Todas",
  );
  const [activeActivityId, setActiveActivityId] = useState<number | null>(null);
  const [draft, setDraft] = useState<EipdWorkspaceRecord | null>(null);

  const ratRecords = useMemo(
    () => buildRegistryWorkspace(getRatRegistryRecords()),
    [workspaceVersion],
  );
  const activityRecords = useMemo(
    () => ratRecords.flatMap((rat) => rat.activities),
    [ratRecords],
  );

  const eipdCases = useMemo(
    () =>
      activityRecords
        .filter((activity) => activity.requiereEipd)
        .map((activity) => buildEipdCaseRecord(activity))
        .sort((left, right) =>
          right.ultimaActualizacion.localeCompare(left.ultimaActualizacion),
        ),
    [activityRecords, workspaceVersion],
  );

  const dependenciaOptions = useMemo(
    () => Array.from(new Set(eipdCases.map((item) => item.dependencia))).sort(),
    [eipdCases],
  );
  const estadoOptions = useMemo(
    () => Array.from(new Set(eipdCases.map((item) => item.estadoEipd))),
    [eipdCases],
  );

  const filteredCases = useMemo(() => {
    const normalizedSearch = normalize(search);

    return eipdCases.filter((item) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalize(
          [
            item.codigoEipd,
            item.ratCodigo,
            item.actividadCodigo,
            item.actividadNombre,
            item.dependencia,
            item.dependenciaEjecutora,
          ].join(" "),
        ).includes(normalizedSearch);
      const matchesDependencia =
        dependencia === "Todas" || item.dependencia === dependencia;
      const matchesEstado = estado === "Todos" || item.estadoEipd === estado;
      const matchesConsulta =
        consulta === "Todas" ||
        (consulta === "Si"
          ? item.requiereConsultaPrevia
          : !item.requiereConsultaPrevia);

      return (
        matchesSearch &&
        matchesDependencia &&
        matchesEstado &&
        matchesConsulta
      );
    });
  }, [consulta, dependencia, eipdCases, estado, search]);

  const activeCase =
    eipdCases.find((item) => item.activityId === activeActivityId) ?? null;

  useEffect(() => {
    if (!activeCase) {
      setDraft(null);
      return;
    }

    setDraft({
      estado: activeCase.estadoEipd,
      requiereConsultaPrevia: activeCase.requiereConsultaPrevia,
      conclusion: activeCase.conclusion,
      fechaProximaRevision: activeCase.fechaProximaRevision,
      ultimaActualizacion: activeCase.ultimaActualizacion,
    });
  }, [activeCase]);

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setDependencia(searchParams.get("dependencia") ?? "Todas");
    setEstado(searchParams.get("estado") ?? "Todos");
    setConsulta(searchParams.get("consulta") ?? "Todas");
  }, [searchParams]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (activeActivityId !== null) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeActivityId]);

  useEffect(() => {
    if (activeActivityId === null || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveActivityId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeActivityId]);

  const stats = useMemo<ExecutiveKpiItem[]>(
    () => [
      {
        label: "Actividades con EIPD",
        value: eipdCases.length,
        tone: "neutral",
      },
      {
        label: "En elaboracion",
        value: eipdCases.filter((item) => item.estadoEipd === "En elaboracion")
          .length,
        tone: "warning",
      },
      {
        label: "En revision DPD",
        value: eipdCases.filter((item) => item.estadoEipd === "En revision DPD")
          .length,
        tone: "orange",
      },
      {
        label: "Consulta previa",
        value: eipdCases.filter((item) => item.requiereConsultaPrevia).length,
        tone: "critical",
        emphasize: eipdCases.some((item) => item.requiereConsultaPrevia),
      },
      {
        label: "Aprobadas",
        value: eipdCases.filter(
          (item) =>
            item.estadoEipd === "Aprobada" || item.estadoEipd === "Vigente",
        ).length,
        tone: "success",
      },
    ],
    [eipdCases],
  );

  const canUpdate = roleCapabilities.eipd.update;
  const canApprove = roleCapabilities.eipd.approve;

  function handleSave() {
    if (!activeCase || !draft) {
      return;
    }

    persistEipdWorkspaceRecord(activeCase.activityId, {
      ...draft,
      ultimaActualizacion: new Date().toISOString().slice(0, 10),
    });
    setWorkspaceVersion((current) => current + 1);
    setActiveActivityId(null);
  }

  return (
    <section className="catalogs-page eipd-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Privacidad</span>
          <h2>EIPD</h2>
          <p className="page-copy">
            Consolide las evaluaciones de impacto para tratamientos de alto
            riesgo, con lectura previa del contexto, riesgos para titulares y
            criterio de aprobacion.
          </p>
          <p className="permission-hint">
            Rol actual: <strong>{roleCapabilities.label}</strong>.{" "}
            {canUpdate
              ? "Puede documentar, actualizar y preparar la evaluacion para revision."
              : canApprove
                ? "Puede revisar el expediente y aprobar el dictamen cuando corresponda."
                : "Puede consultar la EIPD en modo de solo lectura."}
          </p>
        </div>
      </header>

      <ExecutiveKpiGrid items={stats} />

      <section className="panel activities-matrix-panel">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">Evaluacion hija del tratamiento</span>
            <h3>Expedientes EIPD por actividad</h3>
          </div>
          <span className="pill">{filteredCases.length} visibles</span>
        </div>

        <div className="activities-filters">
          <label className="field">
            <span>Buscar</span>
            <input
              className="input"
              placeholder="Codigo EIPD, actividad, dependencia"
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
            <span>Estado EIPD</span>
            <select
              className="input"
              value={estado}
              onChange={(event) => setEstado(event.target.value)}
            >
              <option value="Todos">Todos</option>
              {estadoOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Consulta previa</span>
            <select
              className="input"
              value={consulta}
              onChange={(event) => setConsulta(event.target.value)}
            >
              <option value="Todas">Todas</option>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </label>
        </div>

        {filteredCases.length > 0 ? (
          <TableScrollFrame className="table-wrapper-matrix" maxHeight="none">
            <table className="registry-table registry-table-activities">
              <thead>
                <tr>
                  <th>Codigo EIPD</th>
                  <th>Actividad</th>
                  <th>Dependencia</th>
                  <th>Estado EIPD</th>
                  <th>Riesgo</th>
                  <th>Consulta previa</th>
                  <th>Ultima actualizacion</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((item) => (
                  <tr
                    key={item.activityId}
                    className={
                      activeActivityId === item.activityId
                        ? "table-row-selected table-row-interactive"
                        : "table-row-interactive"
                    }
                    tabIndex={0}
                    aria-selected={activeActivityId === item.activityId}
                    aria-haspopup="dialog"
                    onClick={() => setActiveActivityId(item.activityId)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveActivityId(item.activityId);
                      }
                    }}
                  >
                    <td>
                      <div className="table-primary-copy">
                        <strong>{item.codigoEipd}</strong>
                        <small>{item.ratCodigo}</small>
                      </div>
                    </td>
                    <td>
                      <div className="table-primary-copy">
                        <strong>{item.actividadCodigo}</strong>
                        <small>{item.actividadNombre}</small>
                      </div>
                    </td>
                    <td>{item.dependencia}</td>
                    <td>
                      <span
                        className={`pill eipd-stage-pill-${normalizeToken(
                          item.estadoEipd,
                        )}`}
                      >
                        {item.estadoEipd}
                      </span>
                    </td>
                    <td>
                      <span className={`pill risk-pill-${normalizeToken(item.riesgo)}`}>
                        {item.riesgo}
                      </span>
                    </td>
                    <td>
                      <span
                        className={
                          item.requiereConsultaPrevia
                            ? "pill eipd-pill-yes"
                            : "pill eipd-pill-no"
                        }
                      >
                        {item.requiereConsultaPrevia ? "Si" : "No"}
                      </span>
                    </td>
                    <td>{item.ultimaActualizacion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScrollFrame>
        ) : (
          <div className="empty-state">
            No hay evaluaciones EIPD con los filtros seleccionados.
          </div>
        )}
      </section>

      {activeCase && draft ? (
        <div
          className="report-preview-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="eipd-modal-title"
        >
          <button
            type="button"
            className="report-preview-modal-backdrop"
            aria-label="Cerrar gestion EIPD"
            onClick={() => setActiveActivityId(null)}
          />

          <div className="report-preview-modal-dialog catalog-modal">
            <header className="report-preview-modal-header">
              <div>
                <span className="brand-kicker">Gestion EIPD</span>
                <h3 id="eipd-modal-title">
                  {activeCase.codigoEipd} · {activeCase.actividadNombre}
                </h3>
                <p className="page-copy">
                  Revise el contexto heredado del tratamiento y consolide la
                  necesidad, riesgos, medidas y dictamen de la evaluacion.
                </p>
              </div>

              <div className="report-preview-modal-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setActiveActivityId(null)}
                >
                  Cerrar
                </button>
              </div>
            </header>

            <div className="report-preview-modal-body">
              <div className="activity-action-modal-grid">
                <div className="detail-block">
                  <h4>Identificacion heredada</h4>
                  <dl className="detail-grid">
                    <div>
                      <dt>Codigo RAT</dt>
                      <dd>{activeCase.ratCodigo}</dd>
                    </div>
                    <div>
                      <dt>Codigo actividad</dt>
                      <dd>{activeCase.actividadCodigo}</dd>
                    </div>
                    <div>
                      <dt>Dependencia</dt>
                      <dd>{activeCase.dependencia}</dd>
                    </div>
                    <div>
                      <dt>Dependencia ejecutora</dt>
                      <dd>{activeCase.dependenciaEjecutora}</dd>
                    </div>
                    <div>
                      <dt>Proceso</dt>
                      <dd>{activeCase.report.procesoRelacionado}</dd>
                    </div>
                    <div>
                      <dt>Estado del tratamiento</dt>
                      <dd>
                        <span
                          className={`pill status-pill-${normalizeToken(
                            activeCase.estadoActividad,
                          )}`}
                        >
                          {activeCase.estadoActividad}
                        </span>
                      </dd>
                    </div>
                    <div className="detail-span">
                      <dt>Finalidad</dt>
                      <dd>{activeCase.report.finalidadEspecifica}</dd>
                    </div>
                    <div className="detail-span">
                      <dt>Base de licitud</dt>
                      <dd>{activeCase.report.baseLicitud}</dd>
                    </div>
                  </dl>
                </div>

                <div className="detail-block">
                  <h4>Pre-evaluacion de necesidad</h4>
                  <div className="eipd-criteria-grid">
                    {activeCase.criterios.map((criterion) => (
                      <article key={criterion.label} className="eipd-criterion-card">
                        <strong>{criterion.label}</strong>
                        <span
                          className={
                            criterion.applies ? "pill eipd-pill-yes" : "pill eipd-pill-no"
                          }
                        >
                          {criterion.applies ? "Aplica" : "No aplica"}
                        </span>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="detail-block">
                  <h4>Riesgos para titulares y medidas</h4>
                  <div className="eipd-modal-grid">
                    <div>
                      <h5>Riesgos identificados</h5>
                      <ul className="eipd-list">
                        {activeCase.riesgosTitulares.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h5>Medidas previstas</h5>
                      <ul className="eipd-list">
                        {activeCase.medidasMitigacion.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <h4>Dictamen y seguimiento</h4>
                  <div className="catalog-form-grid">
                    <label className="field">
                      <span>Estado EIPD</span>
                      <select
                        className="input"
                        value={draft.estado}
                        disabled={!canUpdate && !canApprove}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  estado: event.target.value as EipdEvaluationStatus,
                                }
                              : current,
                          )
                        }
                      >
                        {EIPD_STATUS_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Proxima revision</span>
                      <input
                        type="date"
                        className="input"
                        value={draft.fechaProximaRevision}
                        disabled={!canUpdate}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  fechaProximaRevision: event.target.value,
                                }
                              : current,
                          )
                        }
                      />
                    </label>

                    <label className="field full-width field-checkbox">
                      <input
                        type="checkbox"
                        checked={draft.requiereConsultaPrevia}
                        disabled={!canUpdate && !canApprove}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  requiereConsultaPrevia: event.target.checked,
                                }
                              : current,
                          )
                        }
                      />
                      <span>Requiere consulta previa a la SPDP</span>
                    </label>

                    <label className="field full-width">
                      <span>Conclusion y dictamen</span>
                      <textarea
                        className="input textarea"
                        rows={5}
                        value={draft.conclusion}
                        disabled={!canUpdate}
                        onChange={(event) =>
                          setDraft((current) =>
                            current
                              ? { ...current, conclusion: event.target.value }
                              : current,
                          )
                        }
                      />
                    </label>
                  </div>

                  <div className="activity-action-modal-actions">
                    {(canUpdate || canApprove) && draft.estado !== "Vigente" ? (
                      <button
                        type="button"
                        className="button-table-action button-table-action-secondary"
                        onClick={() =>
                          setDraft((current) =>
                            current
                              ? {
                                  ...current,
                                  estado: getNextEipdStatus(current.estado),
                                }
                              : current,
                          )
                        }
                      >
                        Siguiente estado
                      </button>
                    ) : null}
                    {(canUpdate || canApprove) ? (
                      <button
                        type="button"
                        className="button-table-action"
                        onClick={handleSave}
                      >
                        Guardar evaluacion
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

const EIPD_STATUS_OPTIONS: EipdEvaluationStatus[] = [
  "Pre-evaluacion",
  "En elaboracion",
  "En revision DPD",
  "Consulta previa",
  "Aprobada",
  "Vigente",
];

function buildEipdCaseRecord(activity: ActivityRegistryRecord): EipdCaseRecord {
  const traceability = getActivityTraceability(activity.id);
  const workspaceRecord = readEipdWorkspaceRecord(activity.id);
  const sensitiveData = startsWithYes(activity.report.datosSensibles);
  const childrenData = !startsWithNo(activity.report.datosNna);
  const internationalTransfer =
    normalize(activity.report.transferenciasInternacionales) === "si";
  const highRisk = activity.riesgo === "Alto";
  const largeScaleOrSensitive =
    sensitiveData ||
    normalize(activity.report.categoriasDatos).includes("salud") ||
    normalize(activity.report.categoriasDatos).includes("biometric");

  return {
    activityId: activity.id,
    codigoEipd: `EIPD-${activity.codigo}`,
    ratCodigo: activity.ratCodigo,
    actividadCodigo: activity.codigo,
    actividadNombre: activity.nombre,
    dependencia: activity.dependencia,
    dependenciaEjecutora: activity.unidadEjecutora,
    estadoActividad: activity.estado,
    estadoEipd: workspaceRecord.estado,
    riesgo: activity.riesgo,
    requiereConsultaPrevia: workspaceRecord.requiereConsultaPrevia,
    conclusion: workspaceRecord.conclusion,
    fechaProximaRevision: workspaceRecord.fechaProximaRevision,
    ultimaActualizacion: workspaceRecord.ultimaActualizacion,
    report: activity.report,
    criterios: [
      { label: "Alto riesgo identificado", applies: highRisk },
      {
        label: "Categorias especiales de datos",
        applies: sensitiveData,
      },
      {
        label: "Datos de niñas, niños o adolescentes",
        applies: childrenData,
      },
      {
        label: "Transferencia internacional",
        applies: internationalTransfer,
      },
      {
        label: "Tratamiento sensible o de alta escala",
        applies: largeScaleOrSensitive,
      },
    ],
    riesgosTitulares:
      traceability?.riesgosRelacionados.map(
        (item) => `${item.nombre}. ${item.impacto}`,
      ) ?? [activity.report.datosSensibles],
    medidasMitigacion:
      traceability?.controlesClave.length
        ? [
            ...traceability.controlesClave,
            ...traceability.accionesContencion.slice(0, 2),
          ]
        : [activity.report.medidasSeguridad],
  };
}

function readEipdWorkspaceRecord(activityId: number): EipdWorkspaceRecord {
  const stored = readEipdWorkspaceState()[activityId];
  const fallback = DEFAULT_EIPD_CASES[activityId] ?? {
    estado: "Pre-evaluacion" as EipdEvaluationStatus,
    requiereConsultaPrevia: false,
    conclusion:
      "Pendiente de consolidar necesidad, proporcionalidad y medidas de mitigacion.",
    fechaProximaRevision: "",
    ultimaActualizacion: "2026-04-20",
  };

  return {
    ...fallback,
    ...stored,
  };
}

function readEipdWorkspaceState(): Record<number, Partial<EipdWorkspaceRecord>> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(EIPD_WORKSPACE_STORAGE_KEY);

  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<number, Partial<EipdWorkspaceRecord>>;
  } catch {
    return {};
  }
}

function persistEipdWorkspaceRecord(
  activityId: number,
  record: EipdWorkspaceRecord,
) {
  if (typeof window === "undefined") {
    return;
  }

  const nextState = {
    ...readEipdWorkspaceState(),
    [activityId]: record,
  };

  window.localStorage.setItem(
    EIPD_WORKSPACE_STORAGE_KEY,
    JSON.stringify(nextState),
  );
}

function getNextEipdStatus(current: EipdEvaluationStatus): EipdEvaluationStatus {
  switch (current) {
    case "Pre-evaluacion":
      return "En elaboracion";
    case "En elaboracion":
      return "En revision DPD";
    case "En revision DPD":
      return "Aprobada";
    case "Consulta previa":
      return "En revision DPD";
    case "Aprobada":
      return "Vigente";
    default:
      return "Vigente";
  }
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeToken(value: string) {
  return normalize(value).replace(/\s+/g, "-");
}

function startsWithYes(value: string) {
  return normalize(value).startsWith("si");
}

function startsWithNo(value: string) {
  return normalize(value).startsWith("no");
}
