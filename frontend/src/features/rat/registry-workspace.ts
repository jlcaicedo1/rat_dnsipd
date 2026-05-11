import type {
  ActivityRegistryRecord,
  RatRegistryRecord,
  RecordStatus,
} from "./rat-registry-data";

type RegistryWorkspaceState = {
  ratStatusById: Record<number, RecordStatus>;
  activityStatusById: Record<number, RecordStatus>;
  ratVersions: RatRegistryRecord[];
};

const REGISTRY_WORKSPACE_STORAGE_KEY = "rat_dnsipd_registry_workspace";

const EMPTY_WORKSPACE: RegistryWorkspaceState = {
  ratStatusById: {},
  activityStatusById: {},
  ratVersions: [],
};

export function buildRegistryWorkspace(baseRats: RatRegistryRecord[]) {
  const workspace = readWorkspaceState();
  const workspaceRatMap = new Map(
    workspace.ratVersions.map((rat) => [rat.id, clone(rat)] as const),
  );
  const baseRatIds = new Set(baseRats.map((rat) => rat.id));
  const hydratedBase = clone(baseRats).map((rat) =>
    applyRatPatch(
      workspaceRatMap.get(rat.id) ?? rat,
      workspace,
      workspaceRatMap.has(rat.id),
    ),
  );
  const versionedRats = workspace.ratVersions
    .filter((rat) => !baseRatIds.has(rat.id))
    .map((rat) => applyRatPatch(clone(rat), workspace, true));
  const combined = [...hydratedBase, ...versionedRats].sort((left, right) =>
    right.fechaActualizacion.localeCompare(left.fechaActualizacion),
  );

  return combined;
}

export function persistActivityStatus(activityId: number, status: RecordStatus) {
  const workspace = readWorkspaceState();
  workspace.activityStatusById[activityId] = status;
  saveWorkspaceState(workspace);
}

export function persistRatStatus(ratId: number, status: RecordStatus) {
  const workspace = readWorkspaceState();
  workspace.ratStatusById[ratId] = status;
  saveWorkspaceState(workspace);
}

export function createRatVersion(sourceRat: RatRegistryRecord) {
  const workspace = readWorkspaceState();
  const today = new Date().toISOString().slice(0, 10);
  const versionNumber = workspace.ratVersions.filter((item) =>
    item.codigo.startsWith(sourceRat.codigo),
  ).length + 2;
  const nextRatId = Date.now();
  const nextRatCode = `${sourceRat.codigo}-V${versionNumber}`;
  const versionedRat = clone(sourceRat);

  versionedRat.id = nextRatId;
  versionedRat.codigo = nextRatCode;
  versionedRat.nombre = `${sourceRat.nombre} · version ${versionNumber}`;
  versionedRat.estado = "Borrador";
  versionedRat.fechaActualizacion = today;
  versionedRat.resumen =
    "Version preparada para revision, ajuste documental y nueva aprobacion institucional.";
  versionedRat.activities = versionedRat.activities.map((activity, index) => {
    const nextActivityId = nextRatId + index + 1;
    const nextCode = `${activity.codigo}-V${versionNumber}`;

    return {
      ...activity,
      id: nextActivityId,
      ratId: nextRatId,
      codigo: nextCode,
      ratCodigo: nextRatCode,
      ratNombre: versionedRat.nombre,
      estado: "Borrador",
      version: bumpVersion(activity.version),
      fechaActualizacion: today,
      report: {
        ...activity.report,
        codigoRat: nextRatCode,
        nombreTratamiento: activity.nombre,
        estado: "Borrador",
        ultimaActualizacion: today,
      },
    };
  });
  versionedRat.totalActividades = versionedRat.activities.length;

  workspace.ratVersions.unshift(versionedRat);
  saveWorkspaceState(workspace);

  return versionedRat;
}

export function upsertWorkspaceRatRecord(record: RatRegistryRecord) {
  const workspace = readWorkspaceState();
  const nextRecord = clone(record);
  const existingIndex = workspace.ratVersions.findIndex((item) => item.id === nextRecord.id);

  delete workspace.ratStatusById[nextRecord.id];

  for (const activity of nextRecord.activities) {
    delete workspace.activityStatusById[activity.id];
  }

  if (existingIndex >= 0) {
    workspace.ratVersions[existingIndex] = nextRecord;
  } else {
    workspace.ratVersions.unshift(nextRecord);
  }

  saveWorkspaceState(workspace);

  return nextRecord;
}

function applyRatPatch(
  rat: RatRegistryRecord,
  workspace: RegistryWorkspaceState,
  syncStatusFromActivities = false,
) {
  const nextStatus = workspace.ratStatusById[rat.id];
  const nextActivities = rat.activities.map((activity) => {
    const activityStatus = workspace.activityStatusById[activity.id];

    if (!activityStatus) {
      return activity;
    }

    return {
      ...activity,
      estado: activityStatus,
      report: {
        ...activity.report,
        estado: activityStatus,
      },
    };
  });

  return {
    ...rat,
    estado:
      nextStatus ??
      (syncStatusFromActivities
        ? deriveRatStatusFromActivities(nextActivities, rat.estado)
        : rat.estado),
    activities: nextActivities,
    totalActividades: nextActivities.length,
  };
}

function readWorkspaceState(): RegistryWorkspaceState {
  if (typeof window === "undefined") {
    return clone(EMPTY_WORKSPACE);
  }

  const raw = window.localStorage.getItem(REGISTRY_WORKSPACE_STORAGE_KEY);

  if (!raw) {
    return clone(EMPTY_WORKSPACE);
  }

  try {
    const parsed = JSON.parse(raw) as RegistryWorkspaceState;

    return {
      ratStatusById: parsed.ratStatusById ?? {},
      activityStatusById: parsed.activityStatusById ?? {},
      ratVersions: parsed.ratVersions ?? [],
    };
  } catch {
    return clone(EMPTY_WORKSPACE);
  }
}

function saveWorkspaceState(workspace: RegistryWorkspaceState) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(REGISTRY_WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
}

function bumpVersion(version: string) {
  const parts = version.split(".");
  const major = Number(parts[0] ?? "1");
  const minor = Number(parts[1] ?? "0");

  return `${major}.${Number.isFinite(minor) ? minor + 1 : 1}`;
}

function deriveRatStatusFromActivities(
  activities: ActivityRegistryRecord[],
  fallbackStatus: RecordStatus,
) {
  if (activities.length === 0) {
    return fallbackStatus;
  }

  const statuses = activities.map((activity) => activity.estado);

  if (statuses.every((status) => status === statuses[0])) {
    return statuses[0];
  }

  if (statuses.includes("En revision")) {
    return "En revision";
  }

  if (statuses.includes("Borrador")) {
    return "Borrador";
  }

  if (statuses.includes("Vigente")) {
    return "Vigente";
  }

  if (statuses.every((status) => status === "Archivado")) {
    return "Archivado";
  }

  return fallbackStatus;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
