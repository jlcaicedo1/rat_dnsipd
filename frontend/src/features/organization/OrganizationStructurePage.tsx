import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { AppIcon } from "../../components/AppIcon";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import {
  getActivityRegistryRecords,
  getRatRegistryRecords,
  type ActivityRegistryRecord,
  type RatRegistryRecord,
} from "../rat/rat-registry-data";
import {
  getOrganizationUnits,
  saveOrganizationUnits,
  type OrgUnit,
  type OrgUnitStatus,
  type OrgUnitType,
} from "./organization-structure-data";

export function OrganizationStructurePage() {
  const [units, setUnits] = useState(() => getOrganizationUnits());
  const [pendingStatusById, setPendingStatusById] = useState<Record<string, OrgUnitStatus>>({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"Todas" | OrgUnitStatus>("Todas");
  const [typeFilter, setTypeFilter] = useState<"Todos" | OrgUnitType>("Todos");
  const [detailUnitId, setDetailUnitId] = useState<string | null>(null);

  const ratRecords = getRatRegistryRecords();
  const activityRecords = getActivityRegistryRecords();

  const displayedUnits = useMemo(
    () =>
      units.map((unit) =>
        pendingStatusById[unit.id] ? { ...unit, status: pendingStatusById[unit.id] } : unit,
      ),
    [pendingStatusById, units],
  );

  const unitsById = useMemo(
    () => Object.fromEntries(displayedUnits.map((unit) => [unit.id, unit])),
    [displayedUnits],
  );

  const childrenByParent = useMemo(() => {
    const map: Record<string, OrgUnit[]> = {};

    for (const unit of displayedUnits) {
      const parentId = unit.parentId ?? "__root__";
      map[parentId] ??= [];
      map[parentId].push(unit);
    }

    for (const key of Object.keys(map)) {
      map[key].sort((left, right) => left.nombre.localeCompare(right.nombre));
    }

    return map;
  }, [displayedUnits]);

  const maintenanceUnits = useMemo(() => {
    const normalizedSearch = normalize(search);

    return displayedUnits.filter((unit) => {
      const matchesSearch = normalizedSearch.length === 0 || isMatch(unit, normalizedSearch);
      const matchesStatus = isStatusVisible(unit, statusFilter);
      const matchesType = isTypeVisible(unit, typeFilter);

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [displayedUnits, search, statusFilter, typeFilter]);

  const hasPendingStatusChanges = Object.keys(pendingStatusById).length > 0;
  const detailUnit = detailUnitId ? unitsById[detailUnitId] ?? null : null;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (detailUnit) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [detailUnit]);

  useEffect(() => {
    if (!detailUnit || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDetailUnitId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [detailUnit]);

  const stats = [
    {
      label: "Unidades totales",
      value: String(displayedUnits.length),
      icon: "organization" as const,
    },
    {
      label: "Activas",
      value: String(displayedUnits.filter((unit) => unit.status === "Activa").length),
      icon: "settings" as const,
    },
    {
      label: "Inactivas",
      value: String(displayedUnits.filter((unit) => unit.status === "Inactiva").length),
      icon: "impact" as const,
    },
    {
      label: "Siglas definidas",
      value: String(displayedUnits.filter((unit) => Boolean(unit.sigla)).length),
      icon: "catalogs" as const,
    },
  ];

  return (
    <section className="org-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Gobierno maestro</span>
          <div className="page-title-with-icon">
            <span className="page-title-icon">
              <AppIcon name="organization" size={22} strokeWidth={2.1} />
            </span>
            <h2>Administracion de dependencias</h2>
          </div>
          <p className="page-copy">
            Tabla centralizada para activar, deshabilitar y revisar el detalle de las
            unidades organizacionales sin desperdiciar espacio en paneles paralelos.
          </p>
        </div>

        <div className="registry-header-actions">
          <button
            type="button"
            className="button-primary"
            disabled={!hasPendingStatusChanges}
            onClick={() => {
              const nextUnits = units.map((unit) =>
                pendingStatusById[unit.id]
                  ? { ...unit, status: pendingStatusById[unit.id] }
                  : unit,
              );

              setUnits(nextUnits);
              saveOrganizationUnits(nextUnits);
              setPendingStatusById({});
            }}
          >
            Guardar estado actual
          </button>
        </div>
      </header>

      <div className="summary-grid">
        {stats.map((item) => (
          <article key={item.label} className="stat-card">
            <div className="stat-card-top">
              <span>{item.label}</span>
              <span className="stat-card-icon">
                <AppIcon name={item.icon} size={18} strokeWidth={2.1} />
              </span>
            </div>
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
            {getOrgTypes(displayedUnits).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="panel org-admin-single">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">Tabla maestra</span>
            <h3>Dependencias y unidades organizacionales</h3>
          </div>
          <div className="actions">
            <span className="pill">{maintenanceUnits.length} registros filtrados</span>
            {hasPendingStatusChanges ? (
              <span className="pill pill-muted">Cambios pendientes</span>
            ) : null}
          </div>
        </div>

        <TableScrollFrame className="table-wrapper-matrix" maxHeight="69vh">
          <table className="registry-table org-admin-table">
            <thead>
              <tr>
                <th>Unidad</th>
                <th>Sigla</th>
                <th>Tipo</th>
                <th>Padre</th>
                <th>Estado</th>
                <th>Uso</th>
                <th>Detalle</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {maintenanceUnits.map((unit) => {
                const linkedRats = countLinkedRats(unit, ratRecords);
                const linkedActivities = countLinkedActivities(unit, activityRecords);
                const parentName = unit.parentId
                  ? unitsById[unit.parentId]?.nombre ?? "N/A"
                  : "Raiz";
                const persistedUnit = units.find((item) => item.id === unit.id) ?? unit;

                return (
                  <tr key={unit.id}>
                    <td>
                      <strong>{unit.nombre}</strong>
                    </td>
                    <td>{unit.sigla ?? "Pendiente"}</td>
                    <td>{unit.tipo}</td>
                    <td>{parentName}</td>
                    <td>
                      <span
                        className={
                          unit.status === "Activa"
                            ? "pill status-pill-vigente"
                            : "pill status-pill-archivado"
                        }
                      >
                        {unit.status}
                      </span>
                    </td>
                    <td>
                      {linkedRats} RAT · {linkedActivities} act.
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-table-action button-table-action-secondary"
                        onClick={() => setDetailUnitId(unit.id)}
                      >
                        Detalle
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-table-action"
                        onClick={() =>
                          queueUnitStatusChange(
                            unit.id,
                            persistedUnit.status,
                            unit.status,
                            setPendingStatusById,
                          )
                        }
                      >
                        {unit.status === "Activa" ? "Deshabilitar" : "Habilitar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScrollFrame>
      </section>

      {detailUnit ? (
        <OrgUnitDetailModal
          activityRecords={activityRecords}
          onClose={() => setDetailUnitId(null)}
          ratRecords={ratRecords}
          unit={detailUnit}
          unitsById={unitsById}
          children={childrenByParent[detailUnit.id] ?? []}
        />
      ) : null}
    </section>
  );
}

function OrgUnitDetailModal({
  activityRecords,
  children,
  onClose,
  ratRecords,
  unit,
  unitsById,
}: {
  activityRecords: ActivityRegistryRecord[];
  children: OrgUnit[];
  onClose: () => void;
  ratRecords: RatRegistryRecord[];
  unit: OrgUnit;
  unitsById: Record<string, OrgUnit>;
}) {
  return (
    <div
      className="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="organization-unit-detail-title"
    >
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar detalle de unidad"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog org-detail-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Tip de apoyo</span>
            <div className="page-title-with-icon page-title-with-icon-modal">
              <span className="page-title-icon">
                <AppIcon name="organization" size={20} strokeWidth={2.1} />
              </span>
              <h3 id="organization-unit-detail-title">{unit.nombre}</h3>
            </div>
            <p className="page-copy">
              Revise el detalle funcional antes de activar o deshabilitar esta unidad.
            </p>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <div className="org-detail-modal-grid">
            <div className="detail-block">
              <h4>Identidad organizacional</h4>
              <dl className="detail-grid">
                <div>
                  <dt>Unidad</dt>
                  <dd>{unit.nombre}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>{unit.status}</dd>
                </div>
                <div>
                  <dt>Sigla</dt>
                  <dd>{unit.sigla ?? "Pendiente"}</dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>{unit.tipo}</dd>
                </div>
                <div>
                  <dt>Padre</dt>
                  <dd>{unit.parentId ? unitsById[unit.parentId]?.nombre ?? "N/A" : "Raiz"}</dd>
                </div>
                <div>
                  <dt>Responsable referencial</dt>
                  <dd>{unit.ownerRole}</dd>
                </div>
                <div className="detail-span">
                  <dt>Jerarquia</dt>
                  <dd>{getHierarchyLabel(unit, unitsById)}</dd>
                </div>
              </dl>
            </div>

            <div className="detail-block">
              <h4>Impacto operativo</h4>
              <dl className="detail-grid">
                <div>
                  <dt>RAT vinculados</dt>
                  <dd>{countLinkedRats(unit, ratRecords)}</dd>
                </div>
                <div>
                  <dt>Actividades vinculadas</dt>
                  <dd>{countLinkedActivities(unit, activityRecords)}</dd>
                </div>
                <div>
                  <dt>Subunidades directas</dt>
                  <dd>{children.length}</dd>
                </div>
                <div>
                  <dt>Estado recomendado</dt>
                  <dd>
                    {countLinkedRats(unit, ratRecords) > 0 ||
                    countLinkedActivities(unit, activityRecords) > 0
                      ? "Conservar historico"
                      : "Cambio sin impacto directo"}
                  </dd>
                </div>
              </dl>
            </div>

            {children.length > 0 ? (
              <div className="detail-block">
                <h4>Subunidades directas</h4>
                <div className="org-chip-grid">
                  {children.map((child) => (
                    <article key={child.id} className="org-chip-card org-chip-card-static">
                      <strong>{child.nombre}</strong>
                      <span>{child.sigla ?? "Sigla pendiente"} · {child.tipo}</span>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
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

function queueUnitStatusChange(
  unitId: string,
  originalStatus: OrgUnitStatus,
  currentStatus: OrgUnitStatus,
  setPendingStatusById: Dispatch<SetStateAction<Record<string, OrgUnitStatus>>>,
) {
  const nextStatus = currentStatus === "Activa" ? "Inactiva" : "Activa";

  setPendingStatusById((current) => {
    const next = { ...current };

    if (nextStatus === originalStatus) {
      delete next[unitId];
      return next;
    }

    next[unitId] = nextStatus;
    return next;
  });
}
