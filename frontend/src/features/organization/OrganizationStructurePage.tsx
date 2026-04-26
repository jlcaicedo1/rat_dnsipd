import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  getActivityRegistryRecords,
  getRatRegistryRecords,
  type ActivityRegistryRecord,
  type RatRegistryRecord,
} from "../rat/rat-registry-data";
import {
  getOrganizationUnits,
  type OrgUnit,
  type OrgUnitStatus,
  type OrgUnitType,
} from "./organization-structure-data";

type ViewMode = "arbol" | "administracion" | "impacto";

export function OrganizationStructurePage() {
  const [units, setUnits] = useState(() => getOrganizationUnits());
  const [selectedUnitId, setSelectedUnitId] = useState("dsgsif");
  const [viewMode, setViewMode] = useState<ViewMode>("arbol");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todas" | OrgUnitStatus>("Todas");
  const [typeFilter, setTypeFilter] = useState<"Todos" | OrgUnitType>("Todos");

  const ratRecords = getRatRegistryRecords();
  const activityRecords = getActivityRegistryRecords();

  const unitsById = useMemo(
    () => Object.fromEntries(units.map((unit) => [unit.id, unit])),
    [units],
  );

  const childrenByParent = useMemo(() => {
    const map: Record<string, OrgUnit[]> = {};

    for (const unit of units) {
      const parentId = unit.parentId ?? "__root__";
      map[parentId] ??= [];
      map[parentId].push(unit);
    }

    for (const key of Object.keys(map)) {
      map[key].sort((left, right) => left.nombre.localeCompare(right.nombre));
    }

    return map;
  }, [units]);

  const selectedUnit = unitsById[selectedUnitId] ?? units[0] ?? null;

  useEffect(() => {
    if (!selectedUnit && units[0]) {
      setSelectedUnitId(units[0].id);
    }
  }, [selectedUnit, units]);

  const visibleTreeRows = useMemo(() => {
    const result: Array<{ unit: OrgUnit; level: number }> = [];
    const normalizedSearch = normalize(search);

    function hasVisibleDescendant(unitId: string): boolean {
      const children = childrenByParent[unitId] ?? [];

      return children.some((child) => isMatch(child, normalizedSearch) || hasVisibleDescendant(child.id));
    }

    function visit(unitId: string, level: number) {
      const unit = unitsById[unitId];
      if (!unit) {
        return;
      }

      const matchesFilters =
        isStatusVisible(unit, statusFilter) &&
        isTypeVisible(unit, typeFilter) &&
        (normalizedSearch.length === 0 || isMatch(unit, normalizedSearch) || hasVisibleDescendant(unit.id));

      if (!matchesFilters) {
        return;
      }

      result.push({ unit, level });

      for (const child of childrenByParent[unit.id] ?? []) {
        visit(child.id, level + 1);
      }
    }

    visit("iess", 0);

    return result;
  }, [childrenByParent, search, statusFilter, typeFilter, unitsById]);

  const maintenanceUnits = useMemo(() => {
    const normalizedSearch = normalize(search);

    return units.filter((unit) => {
      const matchesSearch = normalizedSearch.length === 0 || isMatch(unit, normalizedSearch);
      const matchesStatus = isStatusVisible(unit, statusFilter);
      const matchesType = isTypeVisible(unit, typeFilter);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [search, statusFilter, typeFilter, units]);

  const selectedSubtree = useMemo(() => {
    if (!selectedUnit) {
      return [];
    }

    const collected: OrgUnit[] = [];

    function visit(unitId: string) {
      const unit = unitsById[unitId];
      if (!unit) {
        return;
      }

      collected.push(unit);

      for (const child of childrenByParent[unitId] ?? []) {
        visit(child.id);
      }
    }

    visit(selectedUnit.id);

    return collected;
  }, [childrenByParent, selectedUnit, unitsById]);

  const selectedNames = useMemo(() => {
    const values = new Set<string>();

    for (const unit of selectedSubtree) {
      values.add(unit.nombre);
      if (unit.sigla) {
        values.add(unit.sigla);
      }
    }

    return values;
  }, [selectedSubtree]);

  const relatedRats = useMemo(
    () =>
      ratRecords.filter(
        (rat) => selectedNames.has(rat.dependencia) || selectedNames.has(rat.unidadResponsable),
      ),
    [ratRecords, selectedNames],
  );

  const relatedActivities = useMemo(
    () =>
      activityRecords.filter((activity) => {
        const baseMatch =
          selectedNames.has(activity.dependencia) ||
          selectedNames.has(activity.unidadEjecutora) ||
          selectedNames.has(activity.ratCodigo);

        if (baseMatch) {
          return true;
        }

        return activity.responsables.some((item) => selectedNames.has(item));
      }),
    [activityRecords, selectedNames],
  );

  const stats = [
    { label: "Unidades totales", value: String(units.length) },
    {
      label: "Activas",
      value: String(units.filter((unit) => unit.status === "Activa").length),
    },
    {
      label: "Siglas definidas",
      value: String(units.filter((unit) => Boolean(unit.sigla)).length),
    },
    { label: "RAT vinculados", value: String(relatedRats.length) },
  ];

  const selectedChildren = selectedUnit ? childrenByParent[selectedUnit.id] ?? [] : [];
  const relatedActivitiesByStatus = summarizeActivitiesByStatus(relatedActivities);
  const relatedActivitiesByRisk = summarizeActivitiesByRisk(relatedActivities);
  const selectedSiglaPending = selectedSubtree.filter((unit) => !unit.sigla).length;

  return (
    <section className="org-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Gobierno maestro</span>
          <h2>Estructura organica</h2>
          <p className="page-copy">
            Esta seccion no debe eliminarse. Debe evolucionar a maestro organizacional:
            organigrama navegable, mantenimiento administrado y base para RAT, actividades,
            activos, permisos y reportes.
          </p>
        </div>

        <div className="registry-header-actions">
          <div className="segmented-switch" role="tablist" aria-label="Vista de estructura organica">
            <button
              type="button"
              className={viewMode === "arbol" ? "segmented-switch-active" : undefined}
              onClick={() => setViewMode("arbol")}
            >
              Arbol institucional
            </button>
            <button
              type="button"
              className={viewMode === "administracion" ? "segmented-switch-active" : undefined}
              onClick={() => setViewMode("administracion")}
            >
              Administracion
            </button>
            <button
              type="button"
              className={viewMode === "impacto" ? "segmented-switch-active" : undefined}
              onClick={() => setViewMode("impacto")}
            >
              Impacto en el sistema
            </button>
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

      <div className="org-toolbar panel">
        <label className="field">
          <span>Buscar unidad o sigla</span>
          <input
            className="input"
            placeholder="Ej. DSGSIF, DNTI, salud, patrocinio"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Estado</span>
          <select
            className="input"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "Todas" | OrgUnitStatus)}
          >
            <option value="Todas">Todas</option>
            <option value="Activa">Activa</option>
            <option value="Inactiva">Inactiva</option>
          </select>
        </label>

        <label className="field">
          <span>Tipo</span>
          <select
            className="input"
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as "Todos" | OrgUnitType)}
          >
            <option value="Todos">Todos</option>
            {getOrgTypes(units).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      {viewMode === "arbol" ? (
        <div className="org-layout">
          <section className="panel org-tree-pane">
            <div className="panel-heading">
              <div>
                <span className="brand-kicker">Explorador visual</span>
                <h3>Organigrama funcional del IESS</h3>
              </div>
              <span className="pill">{visibleTreeRows.length} nodos visibles</span>
            </div>

            <div className="org-tree-list">
              {visibleTreeRows.map(({ unit, level }) => (
                <button
                  key={unit.id}
                  type="button"
                  className={[
                    "org-tree-node",
                    selectedUnit?.id === unit.id ? "org-tree-node-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{ paddingLeft: `${16 + level * 18}px` }}
                  onClick={() => setSelectedUnitId(unit.id)}
                >
                  <div className="org-tree-node-copy">
                    <strong>{unit.nombre}</strong>
                    <small>
                      {unit.sigla ? `${unit.sigla} · ` : "Sigla pendiente · "}
                      {unit.tipo}
                    </small>
                  </div>
                  <span className={unit.status === "Activa" ? "pill status-pill-vigente" : "pill status-pill-archivado"}>
                    {unit.status}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <aside className="panel org-detail-pane">
            {selectedUnit ? (
              <>
                <div className="org-detail-header">
                  <span className="brand-kicker">Unidad seleccionada</span>
                  <h3>{selectedUnit.nombre}</h3>
                  <div className="org-detail-badges">
                    <span className="pill">{selectedUnit.tipo}</span>
                    <span className={selectedUnit.status === "Activa" ? "pill status-pill-vigente" : "pill status-pill-archivado"}>
                      {selectedUnit.status}
                    </span>
                    <span className="pill pill-muted">
                      {selectedUnit.sigla ? selectedUnit.sigla : "Sigla pendiente"}
                    </span>
                  </div>
                </div>

                <div className="detail-block">
                  <h4>Ficha organizacional</h4>
                  <dl className="detail-grid">
                    <div>
                      <dt>Jerarquia</dt>
                      <dd>{getHierarchyLabel(selectedUnit, unitsById)}</dd>
                    </div>
                    <div>
                      <dt>Responsable referencial</dt>
                      <dd>{selectedUnit.ownerRole}</dd>
                    </div>
                    <div>
                      <dt>Unidades hijas</dt>
                      <dd>{selectedChildren.length}</dd>
                    </div>
                    <div>
                      <dt>Sigla</dt>
                      <dd>{selectedUnit.sigla ?? "Pendiente de definicion"}</dd>
                    </div>
                  </dl>
                </div>

                <div className="org-impact-grid">
                  <article className="org-impact-card">
                    <span>RAT asociados</span>
                    <strong>{relatedRats.length}</strong>
                    <small>Registros que dependen de esta unidad o de su arbol descendente.</small>
                  </article>
                  <article className="org-impact-card">
                    <span>Actividades ejecutoras</span>
                    <strong>{relatedActivities.length}</strong>
                    <small>Actividades donde esta unidad opera, controla o ejecuta.</small>
                  </article>
                  <article className="org-impact-card">
                    <span>Siglas pendientes</span>
                    <strong>{selectedSiglaPending}</strong>
                    <small>Dato maestro pendiente que afecta filtros, reportes y codigos.</small>
                  </article>
                </div>

                <div className="detail-block">
                  <h4>Subunidades directas</h4>
                  {selectedChildren.length > 0 ? (
                    <div className="org-chip-grid">
                      {selectedChildren.map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          className="org-chip-card"
                          onClick={() => setSelectedUnitId(child.id)}
                        >
                          <strong>{child.nombre}</strong>
                          <span>{child.sigla ?? "Sigla pendiente"} · {child.tipo}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      Esta unidad no tiene hijas directas en la estructura actual.
                    </div>
                  )}
                </div>

                <div className="detail-block">
                  <h4>Por que esta seccion no debe eliminarse</h4>
                  <ul className="helper-list">
                    <li>Define a que unidad padre se le abre un RAT y que unidad lo ejecuta.</li>
                    <li>Evita texto libre y basura en dependencias, subdirecciones y responsables.</li>
                    <li>Permite filtros, permisos y reportes por arbol organizacional.</li>
                    <li>Prepara el terreno para activos, incidentes, trazabilidad y matrices de riesgo.</li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="empty-state">No hay una unidad seleccionada.</div>
            )}
          </aside>
        </div>
      ) : null}

      {viewMode === "administracion" ? (
        <div className="org-layout">
          <section className="panel org-admin-pane">
            <div className="panel-heading">
              <div>
                <span className="brand-kicker">Gobierno del dato maestro</span>
                <h3>Mantenimiento administrado</h3>
              </div>
              <span className="pill">{maintenanceUnits.length} registros filtrados</span>
            </div>

            <div className="org-governance-banner">
              Las altas, bajas logicas y cambios de estado deben ocurrir aqui, desde un panel de
              administracion con trazabilidad, no directamente en base de datos.
            </div>

            <div className="table-wrapper">
              <table className="registry-table">
                <thead>
                  <tr>
                    <th>Unidad</th>
                    <th>Sigla</th>
                    <th>Tipo</th>
                    <th>Padre</th>
                    <th>Estado</th>
                    <th>Uso</th>
                    <th>Accion</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenanceUnits.map((unit) => {
                    const linkedRats = countLinkedRats(unit, ratRecords);
                    const linkedActivities = countLinkedActivities(unit, activityRecords);
                    const parentName = unit.parentId ? unitsById[unit.parentId]?.nombre ?? "N/A" : "Raiz";

                    return (
                      <tr
                        key={unit.id}
                        className={selectedUnit?.id === unit.id ? "table-row-selected" : undefined}
                        onClick={() => setSelectedUnitId(unit.id)}
                      >
                        <td>
                          <div className="table-primary-copy">
                            <strong>{unit.nombre}</strong>
                            <small>{unit.ownerRole}</small>
                          </div>
                        </td>
                        <td>{unit.sigla ?? "Pendiente"}</td>
                        <td>{unit.tipo}</td>
                        <td>{parentName}</td>
                        <td>
                          <span className={unit.status === "Activa" ? "pill status-pill-vigente" : "pill status-pill-archivado"}>
                            {unit.status}
                          </span>
                        </td>
                        <td>{linkedRats} RAT · {linkedActivities} act.</td>
                        <td>
                          <button
                            type="button"
                            className="button-secondary button-compact"
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleUnitStatus(unit.id, setUnits);
                            }}
                          >
                            {unit.status === "Activa" ? "Deshabilitar" : "Habilitar"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="panel org-detail-pane">
            {selectedUnit ? (
              <>
                <div className="org-detail-header">
                  <span className="brand-kicker">Regla recomendada</span>
                  <h3>Panel administrador de estructura</h3>
                </div>

                <div className="detail-block">
                  <h4>Unidad activa en mantenimiento</h4>
                  <dl className="detail-grid">
                    <div>
                      <dt>Unidad</dt>
                      <dd>{selectedUnit.nombre}</dd>
                    </div>
                    <div>
                      <dt>Estado actual</dt>
                      <dd>{selectedUnit.status}</dd>
                    </div>
                    <div>
                      <dt>Sigla</dt>
                      <dd>{selectedUnit.sigla ?? "Pendiente"}</dd>
                    </div>
                    <div>
                      <dt>Responsable referencial</dt>
                      <dd>{selectedUnit.ownerRole}</dd>
                    </div>
                  </dl>
                </div>

                <div className="detail-block">
                  <h4>Buenas practicas de mantenimiento</h4>
                  <ul className="helper-list">
                    <li>Alta o baja logica de unidades sin editar directamente tablas productivas.</li>
                    <li>Historico de cambios para auditoria y rastreo de responsable.</li>
                    <li>Bloqueo de eliminacion fisica si ya existen RAT, actividades o activos asociados.</li>
                    <li>Control por rol para que solo Administrador o Gobierno del Dato modifique la estructura.</li>
                  </ul>
                </div>

                <div className="detail-block">
                  <h4>Impacto si se deshabilita</h4>
                  <ul className="helper-list">
                    <li>RAT vinculados: {countLinkedRats(selectedUnit, ratRecords)}</li>
                    <li>Actividades vinculadas: {countLinkedActivities(selectedUnit, activityRecords)}</li>
                    <li>La unidad debe quedar fuera de nuevos formularios, pero conservar historico.</li>
                  </ul>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}

      {viewMode === "impacto" ? (
        <div className="org-impact-layout">
          <article className="panel dashboard-panel">
            <span className="brand-kicker">Conexiones reales</span>
            <h3>Como alimenta al resto del sistema</h3>
            <div className="org-impact-grid">
              <article className="org-impact-card">
                <span>RAT</span>
                <strong>{relatedRats.length}</strong>
                <small>Define a quien pertenece el registro y quien lo formaliza.</small>
              </article>
              <article className="org-impact-card">
                <span>Actividades</span>
                <strong>{relatedActivities.length}</strong>
                <small>Controla la unidad ejecutora y evita asignaciones ambiguas.</small>
              </article>
              <article className="org-impact-card">
                <span>Permisos y filtros</span>
                <strong>{selectedSubtree.length}</strong>
                <small>Habilita segmentacion por arbol organizacional completo.</small>
              </article>
              <article className="org-impact-card">
                <span>Calidad de dato</span>
                <strong>{selectedSiglaPending}</strong>
                <small>Identifica deuda maestra que debemos cerrar antes de escalar.</small>
              </article>
            </div>
          </article>

          <div className="dashboard-grid">
            <article className="panel dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span className="brand-kicker">RAT vinculados</span>
                  <h3>Registros impactados</h3>
                </div>
              </div>
              <div className="dashboard-list">
                {relatedRats.length > 0 ? (
                  relatedRats.map((rat) => (
                    <article key={rat.id} className="dashboard-list-item">
                      <div>
                        <strong>{rat.codigo}</strong>
                        <span>{rat.nombre}</span>
                      </div>
                      <div className="dashboard-list-meta">
                        <span className="pill">{rat.estado}</span>
                        <span className="pill">{rat.riesgo}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">No hay RAT asociados al alcance seleccionado.</div>
                )}
              </div>
            </article>

            <article className="panel dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span className="brand-kicker">Actividades vinculadas</span>
                  <h3>Operacion afectada</h3>
                </div>
              </div>
              <div className="dashboard-list">
                {relatedActivities.length > 0 ? (
                  relatedActivities.map((activity) => (
                    <article key={activity.id} className="dashboard-list-item">
                      <div>
                        <strong>{activity.codigo}</strong>
                        <span>{activity.nombre}</span>
                      </div>
                      <div className="dashboard-list-meta">
                        <span className="pill">{activity.estado}</span>
                        <span className="pill">{activity.riesgo}</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">No hay actividades asociadas al alcance seleccionado.</div>
                )}
              </div>
            </article>

            <article className="panel dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span className="brand-kicker">Distribucion por estado</span>
                  <h3>Semaforo operativo</h3>
                </div>
              </div>
              <ul className="helper-list">
                {Object.entries(relatedActivitiesByStatus).map(([status, total]) => (
                  <li key={status}>
                    {status}: {total}
                  </li>
                ))}
              </ul>
            </article>

            <article className="panel dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span className="brand-kicker">Distribucion por riesgo</span>
                  <h3>Prioridad de atencion</h3>
                </div>
              </div>
              <ul className="helper-list">
                {Object.entries(relatedActivitiesByRisk).map(([risk, total]) => (
                  <li key={risk}>
                    {risk}: {total}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isMatch(unit: OrgUnit, normalizedSearch: string) {
  return normalize([unit.nombre, unit.sigla, unit.tipo].filter(Boolean).join(" ")).includes(
    normalizedSearch,
  );
}

function isStatusVisible(unit: OrgUnit, filter: "Todas" | OrgUnitStatus) {
  return filter === "Todas" || unit.status === filter;
}

function isTypeVisible(unit: OrgUnit, filter: "Todos" | OrgUnitType) {
  return filter === "Todos" || unit.tipo === filter;
}

function getOrgTypes(units: OrgUnit[]) {
  return Array.from(new Set(units.map((unit) => unit.tipo))).sort();
}

function getHierarchyLabel(unit: OrgUnit, unitsById: Record<string, OrgUnit>) {
  const chain: string[] = [];
  let current: OrgUnit | undefined = unit;

  while (current) {
    chain.unshift(current.nombre);
    current = current.parentId ? unitsById[current.parentId] : undefined;
  }

  return chain.join(" / ");
}

function countLinkedRats(unit: OrgUnit, ratRecords: RatRegistryRecord[]) {
  return ratRecords.filter(
    (rat) => rat.dependencia === unit.nombre || rat.unidadResponsable === unit.sigla,
  ).length;
}

function countLinkedActivities(unit: OrgUnit, activityRecords: ActivityRegistryRecord[]) {
  return activityRecords.filter(
    (activity) =>
      activity.dependencia === unit.nombre ||
      activity.unidadEjecutora === unit.nombre ||
      activity.responsables.includes(unit.nombre) ||
      Boolean(unit.sigla && activity.responsables.includes(unit.sigla)),
  ).length;
}

function toggleUnitStatus(
  unitId: string,
  setUnits: Dispatch<SetStateAction<OrgUnit[]>>,
) {
  setUnits((currentUnits) =>
    currentUnits.map((unit) =>
      unit.id === unitId
        ? { ...unit, status: unit.status === "Activa" ? "Inactiva" : "Activa" }
        : unit,
    ),
  );
}

function summarizeActivitiesByStatus(activityRecords: ActivityRegistryRecord[]) {
  return {
    Borrador: activityRecords.filter((item) => item.estado === "Borrador").length,
    "En revision": activityRecords.filter((item) => item.estado === "En revision").length,
    Vigente: activityRecords.filter((item) => item.estado === "Vigente").length,
    Archivado: activityRecords.filter((item) => item.estado === "Archivado").length,
  };
}

function summarizeActivitiesByRisk(activityRecords: ActivityRegistryRecord[]) {
  return {
    Bajo: activityRecords.filter((item) => item.riesgo === "Bajo").length,
    Medio: activityRecords.filter((item) => item.riesgo === "Medio").length,
    Alto: activityRecords.filter((item) => item.riesgo === "Alto").length,
  };
}
