import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ExecutiveKpiGrid, type ExecutiveKpiItem } from "../../components/ExecutiveKpiGrid";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import { ReportPreviewModal } from "./ReportPreviewModal";
import {
  defaultSignatureFields,
  getRatRegistryRecords,
  getRatStatusOptions,
  type RatRegistryRecord,
  type SignatureFieldState,
} from "./rat-registry-data";
import { buildRegistryWorkspace, createRatVersion, persistRatStatus } from "./registry-workspace";
import { buildReportPreviewDocument } from "./TreatmentReportPreview";
import { seedTreatmentDraftFromActivity } from "./treatment-draft-storage";

export function RatListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const ratRecords = useMemo(() => buildRegistryWorkspace(getRatRegistryRecords()), [workspaceVersion]);
  const dependenciaOptions = useMemo(
    () => Array.from(new Set(ratRecords.map((item) => item.dependencia))).sort(),
    [ratRecords],
  );
  const statusOptions = getRatStatusOptions();

  const [search, setSearch] = useState("");
  const [dependencia, setDependencia] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [selectedRatId, setSelectedRatId] = useState<number | null>(null);
  const [selectedActivityId, setSelectedActivityId] = useState<number | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const previewSurfaceRef = useRef<HTMLDivElement>(null);

  const filteredRats = ratRecords.filter((record) => {
    const matchesSearch =
      search.trim().length === 0 ||
      [record.codigo, record.nombre, record.dependencia, record.unidadResponsable]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesDependencia = dependencia === "Todas" || record.dependencia === dependencia;
    const matchesEstado = estado === "Todos" || record.estado === estado;

    return matchesSearch && matchesDependencia && matchesEstado;
  });

  const selectedRat = filteredRats.find((item) => item.id === selectedRatId) ?? null;
  const selectedActivity =
    selectedRat?.activities.find((item) => item.id === selectedActivityId) ?? null;

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

    if (!selectedRat.activities.some((item) => item.id === selectedActivityId)) {
      setSelectedActivityId(selectedRat.activities[0]?.id ?? null);
    }
  }, [selectedActivityId, selectedRat]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (isPreviewOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isPreviewOpen]);

  useEffect(() => {
    if (!isPreviewOpen || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsPreviewOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isPreviewOpen]);

  const signatures = buildSignatureFields(selectedRat);

  const stats = useMemo<ExecutiveKpiItem[]>(
    () => [
      {
        label: "RAT registrados",
        value: ratRecords.length,
        tone: "neutral",
      },
      {
        label: "Vigentes",
        value: ratRecords.filter((item) => item.estado === "Vigente").length,
        tone: "success",
      },
      {
        label: "En revision",
        value: ratRecords.filter((item) => item.estado === "En revision").length,
        tone:
          ratRecords.some((item) => item.estado === "En revision") ? "warning" : "neutral",
      },
      {
        label: "Archivados",
        value: ratRecords.filter((item) => item.estado === "Archivado").length,
        tone:
          ratRecords.some((item) => item.estado === "Archivado") ? "warning" : "neutral",
      },
    ],
    [ratRecords],
  );

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
              <select className="input" value={estado} onChange={(event) => setEstado(event.target.value)}>
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
              selectedRat ? "selection-action-bar selection-action-bar-active" : "selection-action-bar"
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
                    {selectedRat.dependencia} · {selectedRat.unidadResponsable}
                  </small>
                </div>

                <div className="selection-action-meta">
                  <StatusBadge value={selectedRat.estado} />
                  <RiskBadge value={selectedRat.riesgo} />
                  <EipdBadge value={selectedRat.requiereEipd} />
                </div>

                <div className="selection-action-buttons">
                  {roleCapabilities.rats.editBase && selectedRat.activities[0] ? (
                    <button
                      type="button"
                      className="button-table-action"
                      onClick={() => {
                        seedTreatmentDraftFromActivity(selectedRat.activities[0], "edit");
                        navigate(`/actividades/nuevo?mode=edit&source=${selectedRat.activities[0].id}`);
                      }}
                    >
                      Editar base
                    </button>
                  ) : null}
                  {roleCapabilities.rats.version ? (
                    <button
                      type="button"
                      className="button-table-action button-table-action-secondary"
                      onClick={() => {
                        const versionedRat = createRatVersion(selectedRat);
                        setSelectedRatId(versionedRat.id);
                        setSelectedActivityId(versionedRat.activities[0]?.id ?? null);
                        setWorkspaceVersion((current) => current + 1);
                      }}
                    >
                      Versionar
                    </button>
                  ) : null}
                  {roleCapabilities.rats.archive && selectedRat.estado !== "Archivado" ? (
                    <button
                      type="button"
                      className="button-table-action button-table-action-danger"
                      onClick={() => {
                        persistRatStatus(selectedRat.id, "Archivado");
                        setWorkspaceVersion((current) => current + 1);
                      }}
                    >
                      Archivar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="button-table-action"
                    onClick={() => setIsPreviewOpen(true)}
                  >
                    Vista previa
                  </button>
                </div>
              </>
            ) : (
              <p className="selection-action-empty">
                Seleccione un RAT para habilitar acciones documentales y de versionado.
              </p>
            )}
          </div>

          <TableScrollFrame className="table-wrapper-matrix" maxHeight="64vh">
            <table className="registry-table registry-table-rats">
              <thead>
                <tr>
                  <th>Codigo RAT</th>
                  <th>Registro</th>
                  <th>Dependencia</th>
                  <th>Estado</th>
                  <th>Riesgo</th>
                  <th>EIPD</th>
                  <th>Actividades</th>
                </tr>
              </thead>
              <tbody>
                {filteredRats.map((record) => {
                  const isSelected = selectedRat?.id === record.id;

                  return (
                    <tr
                      key={record.id}
                      className={isSelected ? "table-row-selected table-row-interactive" : "table-row-interactive"}
                      tabIndex={0}
                      aria-selected={isSelected}
                      onClick={() => setSelectedRatId(record.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedRatId(record.id);
                        }
                      }}
                    >
                      <td>
                        <strong>{record.codigo}</strong>
                      </td>
                      <td>
                        <div className="table-primary-copy">
                          <strong>{record.nombre}</strong>
                          <small>{record.resumen}</small>
                        </div>
                      </td>
                      <td>
                        <div className="table-primary-copy">
                          <strong>{record.unidadResponsable}</strong>
                          <small>{record.dependencia}</small>
                        </div>
                      </td>
                      <td>
                        <StatusBadge value={record.estado} />
                      </td>
                      <td>
                        <RiskBadge value={record.riesgo} />
                      </td>
                      <td>
                        <EipdBadge value={record.requiereEipd} />
                      </td>
                      <td>{record.totalActividades}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScrollFrame>

          {selectedRat ? (
            <section className="registry-activities-strip">
              <div className="panel-heading">
                <div>
                  <span className="brand-kicker">Actividades hijas</span>
                  <h3>{selectedRat.codigo}</h3>
                </div>
                <span className="pill">{selectedRat.activities.length} actividades</span>
              </div>

              <div className="activity-chip-row">
                {selectedRat.activities.map((activity) => {
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
                      <span>{activity.unidadEjecutora}</span>
                      <div className="activity-chip-meta">
                        <StatusBadge value={activity.estado} />
                        <RiskBadge value={activity.riesgo} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="empty-state">No hay RAT para los filtros seleccionados.</div>
          )}
        </section>

        <aside className="panel registry-preview-pane">
          {selectedRat && selectedActivity ? (
            <>
              <div className="registry-preview-summary">
                <div>
                  <span className="brand-kicker">Salida documental</span>
                  <h3>{selectedRat.codigo}</h3>
                  <p className="page-copy">
                    La ficha formal solo se abre cuando necesite validarla antes de imprimirla o descargarla.
                  </p>
                </div>
                <div className="registry-preview-meta">
                  <StatusBadge value={selectedRat.estado} />
                  <RiskBadge value={selectedRat.riesgo} />
                  <EipdBadge value={selectedRat.requiereEipd} />
                </div>
              </div>

              <div className="registry-document-grid">
                <article className="registry-document-card">
                  <span>Actividad seleccionada</span>
                  <strong>{selectedActivity.nombre}</strong>
                  <small>{selectedActivity.codigo}</small>
                </article>
                <article className="registry-document-card">
                  <span>Dependencia responsable</span>
                  <strong>{selectedRat.dependencia}</strong>
                  <small>{selectedRat.unidadResponsable}</small>
                </article>
                <article className="registry-document-card">
                  <span>Ultima actualizacion</span>
                  <strong>{selectedActivity.report.ultimaActualizacion}</strong>
                  <small>Version {selectedActivity.version}</small>
                </article>
                <article className="registry-document-card">
                  <span>Parametros activos</span>
                  <strong>
                    {dependencia === "Todas" ? selectedRat.dependencia : dependencia}
                  </strong>
                  <small>{estado === "Todos" ? selectedRat.estado : estado}</small>
                </article>
              </div>

              <div className="registry-document-actions">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  Vista previa
                </button>
                <button
                  type="button"
                  className="button-primary"
                  onClick={() => setIsPreviewOpen(true)}
                >
                  Imprimir ficha
                </button>
                {roleCapabilities.rats.editBase ? (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => {
                      seedTreatmentDraftFromActivity(selectedActivity, "edit");
                      navigate(`/actividades/nuevo?mode=edit&source=${selectedActivity.id}`);
                    }}
                  >
                    Editar tratamiento base
                  </button>
                ) : null}
              </div>

              <p className="registry-document-note">
                La vista previa es de solo lectura y siempre debe respetar el formato final del documento.
              </p>
            </>
          ) : (
            <div className="empty-state">
              Seleccione un RAT y una actividad para ver la ficha del tratamiento.
            </div>
          )}
        </aside>
      </div>

      {selectedRat && selectedActivity ? (
        <ReportPreviewModal
          activity={selectedActivity}
          heading={`Registro de actividad · ${selectedActivity.codigo}`}
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          onDownload={() => {
            const surfaceMarkup = previewSurfaceRef.current?.innerHTML;

            if (!surfaceMarkup || typeof document === "undefined") {
              return;
            }

            const documentHtml = buildReportPreviewDocument(
              `Registro ${selectedActivity.codigo}`,
              surfaceMarkup,
            );
            const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = objectUrl;
            link.download = `${selectedActivity.codigo}-${slugify(selectedActivity.nombre)}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
          }}
          onPrint={() => {
            if (typeof window !== "undefined") {
              const originalTitle = document.title;
              document.title = `Registro ${selectedActivity.codigo}`;
              window.print();
              window.setTimeout(() => {
                document.title = originalTitle;
              }, 250);
            }
          }}
          report={selectedActivity.report}
          signatures={signatures}
          surfaceRef={previewSurfaceRef}
        />
      ) : null}
    </section>
  );
}

function StatusBadge({ value }: { value: RatRegistryRecord["estado"] }) {
  return (
    <span className={`pill status-pill-${normalizeToken(value)}`}>{value}</span>
  );
}

function RiskBadge({ value }: { value: RatRegistryRecord["riesgo"] }) {
  return (
    <span className={`pill risk-pill-${normalizeToken(value)}`}>{value}</span>
  );
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

function buildSignatureFields(record: RatRegistryRecord | null): SignatureFieldState {
  if (!record) {
    return defaultSignatureFields;
  }

  return {
    elaboradoPorNombre: record.responsableLevantamiento,
    elaboradoPorCargo: "Responsable del levantamiento RAT",
    responsableNombre: record.responsableTratamiento,
    responsableCargo: record.unidadResponsable,
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
