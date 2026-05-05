export type CatalogStatus = "Activo" | "Inactivo";
export type CatalogDomain = "GENERAL" | "TRATAMIENTOS" | "ACTIVOS";

export type CatalogEntry = {
  id: number | string;
  tipo: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
  dominio?: string;
};

export const CATALOG_TYPE_KEYS = {
  BASE_LICITUD: "BASE_LICITUD",
  TIPO_TITULAR: "TIPO_TITULAR",
  CATEGORIA_DATO: "CATEGORIA_DATO",
  ORIGEN_DATO: "ORIGEN_DATO",
  ACCION_TRATAMIENTO: "ACCION_TRATAMIENTO",
  VOLUMEN_TRATAMIENTO: "VOLUMEN_TRATAMIENTO",
  FRECUENCIA_TRATAMIENTO: "FRECUENCIA_TRATAMIENTO",
  PATRON_CONSERVACION: "PATRON_CONSERVACION",
  ALCANCE_GEOGRAFICO: "ALCANCE_GEOGRAFICO",
  RESPUESTA_BINARIA: "RESPUESTA_BINARIA",
  CATEGORIA_TERCERO: "CATEGORIA_TERCERO",
  PAIS: "PAIS",
  TIPO_ACTIVO: "TIPO_ACTIVO",
  NIVEL_ACTIVO: "NIVEL_ACTIVO",
  AMBIENTE_ACTIVO: "AMBIENTE_ACTIVO",
  CLASIFICACION_INFO_ACTIVO: "CLASIFICACION_INFO_ACTIVO",
  VISIBILIDAD_INTERNET: "VISIBILIDAD_INTERNET",
  FUENTE_ACTIVO: "FUENTE_ACTIVO",
  IMPACTO_ACTIVO: "IMPACTO_ACTIVO",
  CLASIFICACION_INFORMACION: "CLASIFICACION_INFORMACION",
} as const;

const TYPE_LABELS: Record<string, string> = {
  [CATALOG_TYPE_KEYS.BASE_LICITUD]: "Base de licitud",
  [CATALOG_TYPE_KEYS.TIPO_TITULAR]: "Tipo de titular",
  [CATALOG_TYPE_KEYS.CATEGORIA_DATO]: "Categoria de dato",
  [CATALOG_TYPE_KEYS.ORIGEN_DATO]: "Origen de dato",
  [CATALOG_TYPE_KEYS.ACCION_TRATAMIENTO]: "Accion de tratamiento",
  [CATALOG_TYPE_KEYS.VOLUMEN_TRATAMIENTO]: "Volumen del tratamiento",
  [CATALOG_TYPE_KEYS.FRECUENCIA_TRATAMIENTO]: "Frecuencia del tratamiento",
  [CATALOG_TYPE_KEYS.PATRON_CONSERVACION]: "Patron de conservacion",
  [CATALOG_TYPE_KEYS.ALCANCE_GEOGRAFICO]: "Alcance geografico",
  [CATALOG_TYPE_KEYS.RESPUESTA_BINARIA]: "Respuesta binaria",
  [CATALOG_TYPE_KEYS.CATEGORIA_TERCERO]: "Categoria de tercero",
  [CATALOG_TYPE_KEYS.PAIS]: "Pais",
  [CATALOG_TYPE_KEYS.TIPO_ACTIVO]: "Tipo del activo",
  [CATALOG_TYPE_KEYS.NIVEL_ACTIVO]: "Nivel del activo",
  [CATALOG_TYPE_KEYS.AMBIENTE_ACTIVO]: "Ambiente del activo",
  [CATALOG_TYPE_KEYS.CLASIFICACION_INFO_ACTIVO]:
    "Clasificacion de informacion del activo",
  [CATALOG_TYPE_KEYS.VISIBILIDAD_INTERNET]: "Visibilidad desde internet",
  [CATALOG_TYPE_KEYS.FUENTE_ACTIVO]: "Fuente del activo",
  [CATALOG_TYPE_KEYS.IMPACTO_ACTIVO]: "Impacto del activo",
  [CATALOG_TYPE_KEYS.CLASIFICACION_INFORMACION]: "Clasificacion de informacion",
};

const DOMAIN_LABELS: Record<string, string> = {
  GENERAL: "General",
  TRATAMIENTOS: "Tratamientos",
  ACTIVOS: "Activos",
};

export function buildEmptyCatalogEntry(): CatalogEntry {
  return {
    id: `catalog-${Date.now()}`,
    tipo: CATALOG_TYPE_KEYS.BASE_LICITUD,
    codigo: "",
    nombre: "",
    descripcion: "",
    activo: true,
    dominio: "GENERAL",
  };
}

export function getCatalogTypes(entries: CatalogEntry[]) {
  return Array.from(new Set(entries.map((entry) => entry.tipo))).sort((left, right) =>
    formatCatalogTypeLabel(left).localeCompare(formatCatalogTypeLabel(right)),
  );
}

export function formatCatalogTypeLabel(tipo: string) {
  return TYPE_LABELS[tipo] ?? titleFromKey(tipo);
}

export function formatCatalogDomainLabel(dominio?: string | null) {
  if (!dominio) {
    return DOMAIN_LABELS.GENERAL;
  }

  return DOMAIN_LABELS[dominio] ?? titleFromKey(dominio);
}

export function getCatalogStatus(entry: Pick<CatalogEntry, "activo">): CatalogStatus {
  return entry.activo ? "Activo" : "Inactivo";
}

export function getCatalogDomains(entries: CatalogEntry[]) {
  return Array.from(
    new Set(
      entries
        .map((entry) => entry.dominio?.trim().toUpperCase())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort((left, right) =>
    formatCatalogDomainLabel(left).localeCompare(formatCatalogDomainLabel(right)),
  );
}

export function getCatalogNamesByType(
  entries: CatalogEntry[],
  tipo: string,
  fallback: string[] = [],
) {
  const names = entries
    .filter((entry) => entry.tipo === tipo && entry.activo)
    .map((entry) => entry.nombre.trim())
    .filter((value) => value.length > 0);

  return names.length > 0 ? names : fallback;
}

function titleFromKey(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}
