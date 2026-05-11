export type AssetValueFormulaConfig = {
  precision: number;
  divisor: number;
  ponderaciones: {
    confidencialidad: number;
    integridad: number;
    disponibilidad: number;
  };
};

export type AssetImpactRange = {
  codigo: string;
  nombre: string;
  limiteSuperior: number;
};

export const DEFAULT_ASSET_VALUE_CONFIG: AssetValueFormulaConfig = {
  precision: 2,
  divisor: 3,
  ponderaciones: {
    confidencialidad: 1,
    integridad: 1,
    disponibilidad: 1,
  },
};

export const DEFAULT_ASSET_IMPACT_RANGES: AssetImpactRange[] = [
  { codigo: "MENOR", nombre: "Menor", limiteSuperior: 1 },
  { codigo: "MODERADO", nombre: "Moderado", limiteSuperior: 2 },
  { codigo: "MAYOR", nombre: "Mayor", limiteSuperior: 3 },
  { codigo: "CATASTROFICO", nombre: "Catastrófico", limiteSuperior: 4 },
];

export function parseAssetValueConfig(value: unknown): AssetValueFormulaConfig {
  if (!isObject(value)) {
    return DEFAULT_ASSET_VALUE_CONFIG;
  }

  const ponderaciones = isObject(value.ponderaciones)
    ? value.ponderaciones
    : DEFAULT_ASSET_VALUE_CONFIG.ponderaciones;

  return {
    precision: clampNumber(value.precision, DEFAULT_ASSET_VALUE_CONFIG.precision, 0, 6),
    divisor: clampNumber(value.divisor, DEFAULT_ASSET_VALUE_CONFIG.divisor, 0.01, 9999),
    ponderaciones: {
      confidencialidad: clampNumber(
        ponderaciones.confidencialidad,
        DEFAULT_ASSET_VALUE_CONFIG.ponderaciones.confidencialidad,
        0,
        9999,
      ),
      integridad: clampNumber(
        ponderaciones.integridad,
        DEFAULT_ASSET_VALUE_CONFIG.ponderaciones.integridad,
        0,
        9999,
      ),
      disponibilidad: clampNumber(
        ponderaciones.disponibilidad,
        DEFAULT_ASSET_VALUE_CONFIG.ponderaciones.disponibilidad,
        0,
        9999,
      ),
    },
  };
}

export function parseAssetImpactRanges(value: unknown): AssetImpactRange[] {
  if (!Array.isArray(value)) {
    return DEFAULT_ASSET_IMPACT_RANGES;
  }

  const ranges = value
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const codigo = typeof item.codigo === "string" ? item.codigo.trim().toUpperCase() : "";
      const nombre = typeof item.nombre === "string" ? item.nombre.trim() : "";
      const limiteSuperior = Number(item.limiteSuperior);

      if (!codigo || !nombre || Number.isNaN(limiteSuperior)) {
        return null;
      }

      return {
        codigo,
        nombre,
        limiteSuperior,
      } satisfies AssetImpactRange;
    })
    .filter((item): item is AssetImpactRange => item !== null)
    .sort((left, right) => left.limiteSuperior - right.limiteSuperior);

  return ranges.length > 0 ? ranges : DEFAULT_ASSET_IMPACT_RANGES;
}

export function calculateAssetValue(input: {
  confidencialidad?: number | null;
  integridad?: number | null;
  disponibilidad?: number | null;
  config?: AssetValueFormulaConfig;
  impactRanges?: AssetImpactRange[];
}) {
  const confidencialidad = normalizeMetricValue(input.confidencialidad);
  const integridad = normalizeMetricValue(input.integridad);
  const disponibilidad = normalizeMetricValue(input.disponibilidad);

  if (
    confidencialidad === null ||
    integridad === null ||
    disponibilidad === null
  ) {
    return {
      valorActivo: null,
      impactoCodigo: null,
      impactoNombre: null,
    };
  }

  const config = input.config ?? DEFAULT_ASSET_VALUE_CONFIG;
  const impactRanges = input.impactRanges ?? DEFAULT_ASSET_IMPACT_RANGES;
  const ponderado =
    confidencialidad * config.ponderaciones.confidencialidad +
    integridad * config.ponderaciones.integridad +
    disponibilidad * config.ponderaciones.disponibilidad;

  const valorActivo = roundTo(ponderado / config.divisor, config.precision);
  const impacto = impactRanges.find((range) => valorActivo <= range.limiteSuperior) ?? null;

  return {
    valorActivo,
    impactoCodigo: impacto?.codigo ?? null,
    impactoNombre: impacto?.nombre ?? null,
  };
}

function normalizeMetricValue(value?: number | null) {
  if (value === null || value === undefined) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(Math.max(parsed, min), max);
}

function roundTo(value: number, precision: number) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function isObject(value: unknown): value is Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
