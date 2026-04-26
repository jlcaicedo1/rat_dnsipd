import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TreatmentReportPreview } from "./TreatmentReportPreview";
import {
  defaultSignatureFields,
  getDependenciaOptions,
  getRatRegistryRecords,
  getRatStatusOptions,
  type RatRegistryRecord,
  type SignatureFieldState,
} from "./rat-registry-data";

export function RatListPage() {
  const ratRecords = getRatRegistryRecords();
  const dependenciaOptions = getDependenciaOptions();
  const statusOptions = getRatStatusOptions();

  const [search, setSearch] = useState("");
  const [dependencia, setDependencia] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [selectedRatId, setSelectedRatId] = useState<number>(ratRecords[0]?.id ?? 0);
  const [selectedActivityId, setSelectedActivityId] = useState<number>(
    ratRecords[0]?.activities[0]?.id ?? 0,
  );
  const [signatures, setSignatures] = useState<SignatureFieldState>(defaultSignatureFields);

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

  const selectedRat =
    filteredRats.find((item) => item.id === selectedRatId) ?? filteredRats[0] ?? null;
  const selectedActivity =
    selectedRat?.activities.find((item) => item.id === selectedActivityId) ??
    selectedRat?.activities[0] ??
    null;

  useEffect(() => {
    if (!selectedRat) {
      return;
    }

    if (selectedRat.id !== selectedRatId) {
      setSelectedRatId(selectedRat.id);
    }

    if (!selectedRat.activities.some((item) => item.id === selectedActivityId)) {
      setSelectedActivityId(selectedRat.activities[0]?.id ?? 0);
    }
  }, [selectedActivityId, selectedRat, selectedRatId]);

  const stats = [
    { label: "RAT registrados", value: String(ratRecords.length) },
    {
      label: "RAT vigentes",
      value: String(ratRecords.filter((item) => item.estado === "Vigente").length),
    },
    {
      label: "Alto riesgo",
      value: String(ratRecords.filter((item) => item.riesgo === "Alto").length),
    },
    {
      label: "Con EIPD",
      value: String(ratRecords.filter((item) => item.requiereEipd).length),
    },
  ];

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
        </div>

        <div className="registry-header-actions">
          <Link to="/rats/new" className="button-primary">
            Nuevo RAT
          </Link>
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

          <div className="table-wrapper table-wrapper-matrix">
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
                      className={isSelected ? "table-row-selected" : undefined}
                      onClick={() => setSelectedRatId(record.id)}
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
          </div>

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
                  <span className="brand-kicker">Vista formalizable</span>
                  <h3>{selectedActivity.nombre}</h3>
                  <p className="page-copy">
                    Esta ficha sirve para revision, aprobacion interna e impresion del tratamiento.
                  </p>
                </div>
                <div className="registry-preview-meta">
                  <StatusBadge value={selectedRat.estado} />
                  <RiskBadge value={selectedRat.riesgo} />
                  <EipdBadge value={selectedRat.requiereEipd} />
                </div>
              </div>

              <TreatmentReportPreview
                report={selectedActivity.report}
                signatures={signatures}
                onSignatureChange={(field, value) =>
                  setSignatures((current) => ({ ...current, [field]: value }))
                }
                onPrint={() => {
                  if (typeof window !== "undefined") {
                    window.print();
                  }
                }}
              />
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
