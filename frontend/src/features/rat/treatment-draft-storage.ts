import type { ActivityRegistryRecord } from "./rat-registry-data";

export type TreatmentDraftMode = "edit" | "duplicate";

type StoredTreatmentDraft = {
  mode: TreatmentDraftMode;
  activityId: number;
  sourceLabel: string;
  dependenciaNombre: string;
  unidadEjecutoraNombre: string;
  values: Record<string, string | string[]>;
};

const TREATMENT_DRAFT_STORAGE_KEY = "rat_dnsipd_treatment_draft";

export function seedTreatmentDraftFromActivity(
  activity: ActivityRegistryRecord,
  mode: TreatmentDraftMode,
) {
  if (typeof window === "undefined") {
    return;
  }

  const values = {
    nombreTratamiento:
      mode === "duplicate" ? `${activity.nombre} · copia de trabajo` : activity.nombre,
    descripcion: activity.report.finalidadEspecifica,
    finalidad: activity.report.finalidadEspecifica,
    descripcionBaseLegal: activity.report.normaAplicable,
    titulares: splitCsv(activity.report.titulares),
    categoriasDatos: splitCsv(activity.report.categoriasDatos),
    descripcionDatos: activity.report.datosSensibles,
    procedenciaDatos: activity.report.origenDatos,
    accionesTratamiento: splitCsv(activity.report.accionesTratamiento),
    plazoRetencion: activity.report.plazoConservacion,
    fechaLevantamiento: activity.report.fechaCreacion,
    fechaActualizacion: activity.report.ultimaActualizacion,
    medidasSeguridad: activity.report.medidasSeguridad,
    observacionRiesgo: activity.pendientes.join(" · "),
  };

  const payload: StoredTreatmentDraft = {
    mode,
    activityId: activity.id,
    sourceLabel: `${activity.codigo} · ${activity.nombre}`,
    dependenciaNombre: activity.dependencia,
    unidadEjecutoraNombre: activity.unidadEjecutora,
    values,
  };

  window.localStorage.setItem(TREATMENT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
}

export function loadTreatmentDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(TREATMENT_DRAFT_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as StoredTreatmentDraft;
  } catch {
    window.localStorage.removeItem(TREATMENT_DRAFT_STORAGE_KEY);
    return null;
  }
}

export function clearTreatmentDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(TREATMENT_DRAFT_STORAGE_KEY);
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
