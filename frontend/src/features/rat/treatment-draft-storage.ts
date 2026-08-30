import type { ActivityRegistryRecord } from "./rat-registry-data";

// Mapping from DB CATEGORIA_DATO.codigo → short frontend domain id (must stay stable)
const CATEGORIA_CODE_TO_SHORT_ID: Record<string, string> = {
  DATOS_DE_IDENTIFICACION: "identificacion",
  DATOS_DE_CONTACTO: "contacto",
  DATOS_LABORALES: "laborales",
  DATOS_ACADEMICOS: "academicos",
  DATOS_DE_SALUD: "salud",
  DATOS_BIOMETRICOS: "biometricos",
  DATOS_FINANCIEROS_BANCARIOS_O_CREDITICIOS: "financieros",
  DATOS_SOCIOECONOMICOS: "socioeconomicos",
  DATOS_DE_PARENTESCO_O_VINCULO: "familiares",
  DATOS_DE_FILIACION: "filiacion",
  DATOS_DE_DIVERSIDAD_Y_AUTOIDENTIFICACION: "diversidad",
  DATOS_DE_CONDICION_MIGRATORIA: "migratorios",
  DATOS_RELACIONADOS_CON_AFILIACION_SINDICAL_O_GREMIAL: "sindicales",
  DATOS_DE_PERSONAS_CON_DISCAPACIDAD_Y_SUS_SUSTITUTOS: "discapacidad",
  DATOS_DE_MENORES_DE_EDAD: "menores",
  DATOS_LEGALES_Y_DE_CUMPLIMIENTO_NORMATIVO: "judiciales",
  DATOS_TECNOLOGICOS: "tecnologicos",
};

type StructuredCategoriaDato = {
  titular: string;
  codigo: string;
  campos: string[];
};

type PersonalDataDomainSelection = {
  fields: string[];
  justification: string;
};

type BackendActivityForDraft = {
  id: number;
  codigo: string;
  nombre: string;
  ratCodigo: string;
  dependencia: string;
  subdireccion: string | null;
  finalidad: string | null;
  normaAplicable: string | null;
  categoriasTitulares: string | null;
  categoriasDatos: unknown;
  origenDatos: string | null;
  accionesTratamiento: unknown;
  plazoConservacion: string | null;
  fechaLevantamiento: string | null;
  medidaSeguridad: string | null;
};

export type TreatmentDraftMode = "edit" | "duplicate";

type StoredTreatmentDraft = {
  mode: TreatmentDraftMode;
  activityId: number;
  sourceLabel: string;
  dependenciaNombre: string;
  unidadEjecutoraNombre: string;
  values: Record<string, unknown>;
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

export function seedTreatmentDraftFromBackendActivity(
  activity: BackendActivityForDraft,
  mode: TreatmentDraftMode,
) {
  if (typeof window === "undefined") {
    return;
  }

  const toStringArray = (val: unknown): string[] => {
    if (Array.isArray(val)) return (val as string[]).filter(Boolean);
    if (typeof val === "string") return val.split(",").map((s) => s.trim()).filter(Boolean);
    return [];
  };

  // Detect structured categoriasDatos: { titular, codigo, campos }[]  (new import format)
  // vs. legacy: string[] (old import or manual entry)
  const catDatos = activity.categoriasDatos;
  const titulares: string[] = [];
  const datosPersonalesDetalle: Record<string, Record<string, PersonalDataDomainSelection>> = {};
  let legacyCategoriasDatos: string[] = [];

  if (Array.isArray(catDatos) && catDatos.length > 0) {
    const first = catDatos[0];
    if (first !== null && typeof first === "object" && "codigo" in (first as object)) {
      // New structured format from import
      for (const item of catDatos as StructuredCategoriaDato[]) {
        const domainId = CATEGORIA_CODE_TO_SHORT_ID[item.codigo];
        const titularKey = item.titular || "";
        if (!domainId || !titularKey) continue;

        if (!titulares.includes(titularKey)) titulares.push(titularKey);

        if (!datosPersonalesDetalle[titularKey]) datosPersonalesDetalle[titularKey] = {};
        const existing = datosPersonalesDetalle[titularKey][domainId];
        if (existing) {
          for (const campo of item.campos) {
            if (!existing.fields.includes(campo)) existing.fields.push(campo);
          }
        } else {
          datosPersonalesDetalle[titularKey][domainId] = {
            fields: [...item.campos],
            justification: "",
          };
        }
      }
    } else {
      // Legacy string[] format
      legacyCategoriasDatos = toStringArray(catDatos);
    }
  }

  const values = {
    nombreTratamiento:
      mode === "duplicate" ? `${activity.nombre} · copia de trabajo` : activity.nombre,
    descripcion: activity.finalidad ?? "",
    finalidad: activity.finalidad ?? "",
    descripcionBaseLegal: activity.normaAplicable ?? "",
    titulares:
      titulares.length > 0
        ? titulares
        : toStringArray(activity.categoriasTitulares),
    categoriasDatos:
      legacyCategoriasDatos.length > 0
        ? legacyCategoriasDatos
        : [],
    datosPersonalesDetalle,
    procedenciaDatos: activity.origenDatos ?? "",
    accionesTratamiento: toStringArray(activity.accionesTratamiento),
    plazoRetencion: activity.plazoConservacion ?? "",
    fechaLevantamiento: activity.fechaLevantamiento ?? "",
    medidasSeguridad: activity.medidaSeguridad ?? "",
  };

  const payload: StoredTreatmentDraft = {
    mode,
    activityId: activity.id,
    sourceLabel: `${activity.codigo} · ${activity.nombre}`,
    dependenciaNombre: activity.dependencia,
    unidadEjecutoraNombre: activity.subdireccion ?? activity.dependencia,
    values,
  };

  window.localStorage.setItem(TREATMENT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
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
