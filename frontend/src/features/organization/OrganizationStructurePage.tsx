import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppIcon } from "../../components/AppIcon";
import { ExecutiveKpiGrid, type ExecutiveKpiItem } from "../../components/ExecutiveKpiGrid";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
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

type PendingOrgUnitChange = Partial<Pick<OrgUnit, "nombre" | "sigla" | "ownerRole" | "status">>;

export function OrganizationStructurePage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const [units, setUnits] = useState(() => getOrganizationUnits());
  const [pendingChangesById, setPendingChangesById] = useState<
    Record<string, PendingOrgUnitChange>
  >({});
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [statusFilter, setStatusFilter] = useState<"Todas" | OrgUnitStatus>(
    () => (searchParams.get("estado") as "Todas" | OrgUnitStatus) ?? "Todas",
  );
  const [typeFilter, setTypeFilter] = useState<"Todos" | OrgUnitType>(
    () => (searchParams.get("tipo") as "Todos" | OrgUnitType) ?? "Todos",
  );
  const [usageFilter, setUsageFilter] = useState<"Todos" | "Con RAT" | "Sin uso">(
    () => {
      const usage = searchParams.get("uso");
      if (usage === "con-rat") {
        return "Con RAT";
      }
      if (usage === "sin-uso") {
        return "Sin uso";
      }
      return "Todos";
    },
  );
  const [activeUnitId, setActiveUnitId] = useState<string | null>(null);

  const ratRecords = getRatRegistryRecords();
  const activityRecords = getActivityRegistryRecords();

  const unitsById = useMemo(
    () => Object.fromEntries(units.map((unit) => [unit.id, unit])),
    [units],
  );

  const displayedUnits = useMemo(
    () => units.map((unit) => mergeUnitWithPendingChange(unit, pendingChangesById[unit.id])),
    [pendingChangesById, units],
  );

  const displayedUnitsById = useMemo(
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
      const matchesStatus = statusFilter === "Todas" || unit.status === statusFilter;
      const matchesType = typeFilter === "Todos" || unit.tipo === typeFilter;
      const linkedRats = countLinkedRats(unit, ratRecords);
      const linkedActivities = countLinkedActivities(unit, activityRecords);
      const matchesUsage =
        usageFilter === "Todos" ||
        (usageFilter === "Con RAT" ? linkedRats > 0 : linkedRats === 0 && linkedActivities === 0);

      return matchesSearch && matchesStatus && matchesType && matchesUsage;
    });
  }, [activityRecords, displayedUnits, ratRecords, search, statusFilter, typeFilter, usageFilter]);

  const hasPendingChanges = Object.keys(pendingChangesById).length > 0;
  const activeUnit = activeUnitId ? displayedUnitsById[activeUnitId] ?? null : null;
  const activeUnitPendingChange = activeUnitId ? pendingChangesById[activeUnitId] : undefined;
  if (!roleCapabilities.organization.view) {
    return (
      <section className="panel access-panel">
        <span className="brand-kicker">Acceso restringido</span>
        <h2>Administracion de dependencias</h2>
        <p className="page-copy">
          Esta vista queda reservada para perfiles administradores porque afecta maestros,
          permisos, filtros y disponibilidad de nuevas dependencias dentro del sistema.
        </p>
      </section>
    );
  }

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setStatusFilter((searchParams.get("estado") as "Todas" | OrgUnitStatus) ?? "Todas");
    setTypeFilter((searchParams.get("tipo") as "Todos" | OrgUnitType) ?? "Todos");
    const usage = searchParams.get("uso");
    setUsageFilter(usage === "con-rat" ? "Con RAT" : usage === "sin-uso" ? "Sin uso" : "Todos");
  }, [searchParams]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (activeUnit) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeUnit]);

  useEffect(() => {
    if (!activeUnit || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveUnitId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeUnit]);

  const stats: ExecutiveKpiItem[] = [
    {
      label: "Total dependencias",
      value: displayedUnits.length,
      tone: "neutral",
    },
    {
      label: "Activas",
      value: displayedUnits.filter((unit) => unit.status === "Activa").length,
      tone: "success",
    },
    {
      label: "Inactivas",
      value: displayedUnits.filter((unit) => unit.status === "Inactiva").length,
      tone:
        displayedUnits.some((unit) => unit.status === "Inactiva") ? "warning" : "neutral",
    },
    {
      label: "Sin uso",
      value: displayedUnits.filter(
        (unit) =>
          countLinkedRats(unit, ratRecords) === 0 &&
          countLinkedActivities(unit, activityRecords) === 0,
      ).length,
      tone: "neutral",
    },
  ];

  function handleSaveAllChanges() {
    const nextUnits = units.map((unit) => mergeUnitWithPendingChange(unit, pendingChangesById[unit.id]));

    setUnits(nextUnits);
    saveOrganizationUnits(nextUnits);
    setPendingChangesById({});
  }

  function handleQueueStatusChange(unit: OrgUnit) {
    if (!roleCapabilities.organization.updateStatus) {
      return;
    }

    applyPendingChanges(unit.id, { status: unit.status === "Activa" ? "Inactiva" : "Activa" });
  }

  function applyPendingChanges(unitId: string, changes: PendingOrgUnitChange) {
    const originalUnit = unitsById[unitId];

    if (!originalUnit) {
      return;
    }

    setPendingChangesById((current) => {
      const next = { ...current };
      const normalized = getNormalizedPendingChange(originalUnit, {
        ...current[unitId],
        ...changes,
      });

      if (normalized) {
        next[unitId] = normalized;
      } else {
        delete next[unitId];
      }

      return next;
    });
  }

  function resetPendingChanges(unitId: string) {
    setPendingChangesById((current) => {
      if (!current[unitId]) {
        return current;
      }

      const next = { ...current };
      delete next[unitId];
      return next;
    });
  }

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
            La estructura organica se gestiona como maestro transversal desde una sola tabla:
            cambio rapido de estado, detalle contextual y persistencia administrativa centralizada.
          </p>
          <p className="permission-hint">
            Rol actual: <strong>{roleCapabilities.label}</strong>. Los cambios quedan en borrador
            hasta confirmar el guardado general del modulo.
          </p>
        </div>

        <div className="registry-header-actions">
          {roleCapabilities.organization.save ? (
            <button
              type="button"
              className="button-primary"
              disabled={!hasPendingChanges}
              onClick={handleSaveAllChanges}
            >
              Guardar cambios
            </button>
          ) : null}
        </div>
      </header>

      <ExecutiveKpiGrid items={stats} />

      <div className="org-toolbar panel">
        <label className="field">
          <span>Buscar dependencia o sigla</span>
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

        <label className="field">
          <span>Uso</span>
          <select
            className="input"
            value={usageFilter}
            onChange={(event) => setUsageFilter(event.target.value as "Todos" | "Con RAT" | "Sin uso")}
          >
            <option value="Todos">Todos</option>
            <option value="Con RAT">Con RAT</option>
            <option value="Sin uso">Sin uso</option>
          </select>
        </label>
      </div>

      <section className="panel org-admin-single">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">Tabla maestra</span>
            <h3>Dependencias de la estructura organizacional</h3>
          </div>
          <div className="actions">
            <span className="pill">{maintenanceUnits.length} registros filtrados</span>
            {hasPendingChanges ? <span className="pill pill-muted">Cambios pendientes</span> : null}
          </div>
        </div>

        <TableScrollFrame className="table-wrapper-matrix" maxHeight="none">
          <table className="registry-table org-admin-table">
            <thead>
              <tr>
                <th>Dependencia</th>
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
                const parentName = unit.parentId ? displayedUnitsById[unit.parentId]?.nombre ?? "N/A" : "Raiz";
                const hasPendingUnitChanges = Boolean(pendingChangesById[unit.id]);

                return (
                  <tr key={unit.id}>
                    <td>
                      <strong>{unit.nombre}</strong>
                    </td>
                    <td>{unit.sigla ?? "Pendiente"}</td>
                    <td>{unit.tipo}</td>
                    <td>{parentName}</td>
                    <td>
                      <div className="org-status-stack">
                        <span
                          className={
                            unit.status === "Activa"
                              ? "pill status-pill-vigente"
                              : "pill status-pill-archivado"
                          }
                        >
                          {unit.status}
                        </span>
                        {hasPendingUnitChanges ? (
                          <small className="org-status-pending">Pendiente de guardar</small>
                        ) : null}
                      </div>
                    </td>
                    <td>
                      {linkedRats} RAT · {linkedActivities} act.
                    </td>
                    <td>
                      <button
                        type="button"
                        className="button-table-action button-table-action-secondary"
                        onClick={() => setActiveUnitId(unit.id)}
                      >
                        Detalle
                      </button>
                    </td>
                    <td>
                      {roleCapabilities.organization.updateStatus ? (
                        <button
                          type="button"
                          className={
                            unit.status === "Activa"
                              ? "button-table-action button-table-action-danger"
                              : "button-table-action"
                          }
                          onClick={() => handleQueueStatusChange(unit)}
                        >
                          {unit.status === "Activa" ? "Deshabilitar" : "Habilitar"}
                        </button>
                      ) : (
                        <span className="selection-action-empty">Solo lectura</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScrollFrame>
      </section>

      {activeUnit ? (
        <OrgUnitManagementModal
          activityRecords={activityRecords}
          children={childrenByParent[activeUnit.id] ?? []}
          onApplyChanges={applyPendingChanges}
          onClose={() => setActiveUnitId(null)}
          onResetChanges={resetPendingChanges}
          pendingChange={activeUnitPendingChange}
          ratRecords={ratRecords}
          roleCanEdit={roleCapabilities.organization.save}
          unit={activeUnit}
          unitsById={displayedUnitsById}
        />
      ) : null}
    </section>
  );
}

function OrgUnitManagementModal({
  activityRecords,
  children,
  onApplyChanges,
  onClose,
  onResetChanges,
  pendingChange,
  ratRecords,
  roleCanEdit,
  unit,
  unitsById,
}: {
  activityRecords: ActivityRegistryRecord[];
  children: OrgUnit[];
  onApplyChanges: (unitId: string, changes: PendingOrgUnitChange) => void;
  onClose: () => void;
  onResetChanges: (unitId: string) => void;
  pendingChange?: PendingOrgUnitChange;
  ratRecords: RatRegistryRecord[];
  roleCanEdit: boolean;
  unit: OrgUnit;
  unitsById: Record<string, OrgUnit>;
}) {
  const linkedRats = countLinkedRats(unit, ratRecords);
  const linkedActivities = countLinkedActivities(unit, activityRecords);
  const [draftName, setDraftName] = useState(unit.nombre);
  const [draftSigla, setDraftSigla] = useState(unit.sigla ?? "");
  const [draftOwnerRole, setDraftOwnerRole] = useState(unit.ownerRole);
  const hasUnitPendingChanges = Boolean(pendingChange);
  const isApplyDisabled = draftName.trim().length === 0 || draftOwnerRole.trim().length === 0;

  useEffect(() => {
    setDraftName(unit.nombre);
    setDraftSigla(unit.sigla ?? "");
    setDraftOwnerRole(unit.ownerRole);
  }, [unit.id, unit.nombre, unit.ownerRole, unit.sigla]);

  function handleApply() {
    onApplyChanges(unit.id, {
      nombre: draftName,
      sigla: draftSigla,
      ownerRole: draftOwnerRole,
    });
    onClose();
  }

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
        aria-label="Cerrar gestion de dependencia"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog org-detail-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Gestion de dependencia</span>
            <div className="page-title-with-icon page-title-with-icon-modal">
              <span className="page-title-icon">
                <AppIcon name="organization" size={20} strokeWidth={2.1} />
              </span>
              <h3 id="organization-unit-detail-title">{unit.nombre}</h3>
            </div>
            <p className="page-copy">
              Revise impacto y edite los datos maestros. La persistencia final se confirma desde la
              tabla principal con el guardado global.
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
                  <dt>Estado actual</dt>
                  <dd>{unit.status}</dd>
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
                  <dd>{linkedRats}</dd>
                </div>
                <div>
                  <dt>Actividades vinculadas</dt>
                  <dd>{linkedActivities}</dd>
                </div>
                <div>
                  <dt>Dependencias hijas</dt>
                  <dd>{children.length}</dd>
                </div>
                <div>
                  <dt>Resultado esperado</dt>
                  <dd>{hasUnitPendingChanges ? "Cambios pendientes de guardar" : "Sin cambios pendientes"}</dd>
                </div>
              </dl>
            </div>

            {children.length > 0 ? (
              <div className="detail-block">
                <h4>Dependencias hijas</h4>
                <div className="org-chip-grid">
                  {children.map((child) => (
                    <article key={child.id} className="org-chip-card org-chip-card-static">
                      <strong>{child.nombre}</strong>
                      <span>
                        {child.sigla ?? "Sigla pendiente"} · {child.tipo}
                      </span>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="detail-block">
              <h4>Edicion del maestro</h4>
              <div className="detail-form-grid">
                <label className="field">
                  <span>Nombre de la dependencia</span>
                  <input
                    className="input"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    disabled={!roleCanEdit}
                  />
                </label>

                <label className="field">
                  <span>Sigla</span>
                  <input
                    className="input"
                    value={draftSigla}
                    onChange={(event) => setDraftSigla(event.target.value.toUpperCase())}
                    disabled={!roleCanEdit}
                    placeholder="Ej. DSGSIF"
                  />
                </label>

                <label className="field detail-form-span">
                  <span>Responsable referencial</span>
                  <input
                    className="input"
                    value={draftOwnerRole}
                    onChange={(event) => setDraftOwnerRole(event.target.value)}
                    disabled={!roleCanEdit}
                  />
                </label>
              </div>

              <div className="activity-action-modal-actions">
                {hasUnitPendingChanges ? (
                  <button
                    type="button"
                    className="button-table-action button-table-action-secondary"
                    onClick={() => {
                      onResetChanges(unit.id);
                      onClose();
                    }}
                  >
                    Descartar cambios de esta dependencia
                  </button>
                ) : null}
                {roleCanEdit ? (
                  <button
                    type="button"
                    className="button-table-action"
                    disabled={isApplyDisabled}
                    onClick={handleApply}
                  >
                    Aplicar cambios
                  </button>
                ) : null}
              </div>
              <p className="selection-action-empty">
                La deshabilitacion se realiza desde la tabla principal. Este modal se reserva para
                revisar impacto y ajustar los datos maestros.
              </p>
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

function isMatch(unit: OrgUnit, normalizedSearch: string) {
  return normalize([unit.nombre, unit.sigla, unit.tipo].filter(Boolean).join(" ")).includes(
    normalizedSearch,
  );
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

function mergeUnitWithPendingChange(unit: OrgUnit, change?: PendingOrgUnitChange): OrgUnit {
  if (!change) {
    return unit;
  }

  return {
    ...unit,
    ...change,
    nombre: change.nombre !== undefined ? normalizeText(change.nombre) : unit.nombre,
    sigla: change.sigla !== undefined ? normalizeOptionalText(change.sigla) : unit.sigla,
    ownerRole: change.ownerRole !== undefined ? normalizeText(change.ownerRole) : unit.ownerRole,
    status: change.status ?? unit.status,
  };
}

function getNormalizedPendingChange(
  originalUnit: OrgUnit,
  draft: PendingOrgUnitChange,
): PendingOrgUnitChange | null {
  const next: PendingOrgUnitChange = {};

  if (draft.nombre !== undefined) {
    const normalizedName = normalizeText(draft.nombre);
    if (normalizedName !== originalUnit.nombre) {
      next.nombre = normalizedName;
    }
  }

  if (draft.sigla !== undefined) {
    const normalizedSigla = normalizeOptionalText(draft.sigla);
    if ((normalizedSigla ?? "") !== (originalUnit.sigla ?? "")) {
      next.sigla = normalizedSigla;
    }
  }

  if (draft.ownerRole !== undefined) {
    const normalizedOwner = normalizeText(draft.ownerRole);
    if (normalizedOwner !== originalUnit.ownerRole) {
      next.ownerRole = normalizedOwner;
    }
  }

  if (draft.status !== undefined && draft.status !== originalUnit.status) {
    next.status = draft.status;
  }

  return Object.keys(next).length > 0 ? next : null;
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeOptionalText(value?: string) {
  const normalized = normalizeText(value ?? "");
  return normalized.length > 0 ? normalized : undefined;
}
