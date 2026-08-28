import { useQuery } from "@tanstack/react-query";
import type { CatalogoRelacion, CatalogTreeDominio, CatalogTreeItem } from "../catalogs/catalogs-data";
import type { PersonalDataDomain } from "./rat-form-options";
import {
  PERSONAL_DATA_DOMAINS as FALLBACK_DOMAINS,
  PERSONAL_DATA_TITULAR_RELATIONSHIPS as FALLBACK_RELATIONSHIPS,
} from "./rat-form-options";
import { apiClient } from "../../services/api-client";

type TreeResponse = { data: CatalogTreeDominio[] };
type RelacionesResponse = { data: CatalogoRelacion[] };

// Static map from DB CATEGORIA_DATO.codigo → short frontend domain id
// The short id is the key used in datosPersonalesDetalle (must stay stable for existing saved data)
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

// Static map from DB TIPO_TITULAR.codigo → short frontend titular key
// getDomainIdsForTitular uses normalizeOrgKey(titular).includes(key) so short lowercase keys work
const TITULAR_CODE_TO_SHORT_KEY: Record<string, string> = {
  COLABORADORES_SERVIDORES_FUNCIONARIOS: "colaboradores",
  COLABORADORES_TRABAJADORES: "colaboradores",
  EXSERVIDORES: "exservidores",
  PASANTES: "pasantes",
  PRACTICANTES_ESTUDIANTILES: "practicantes",
  INTERNOS_ROTATIVOS: "internos",
  POSTULANTES_A_PROCESOS_DE_SELECCION: "postulantes",
  AFILIADOS: "afiliados",
  PENSIONISTAS: "pensionistas",
  BENEFICIARIOS: "beneficiarios",
  JUBILADOS: "jubilados",
  DERECHOHABIENTES: "derechohabientes",
  EMPLEADOR_PERSONA_NATURAL: "empleador",
  APODERADOS_O_MANDATARIOS: "apoderados",
  PERSONAL_DE_CONTRATISTAS_O_CONSULTORES: "contratistas",
  TUTORES_O_REPRESENTANTES_LEGALES: "tutores",
};

function buildDomainsFromTree(catItems: CatalogTreeItem[]): PersonalDataDomain[] {
  return catItems
    .filter((cat) => cat.activo)
    .map((cat): PersonalDataDomain | null => {
      const shortId = CATEGORIA_CODE_TO_SHORT_ID[cat.codigo];
      if (!shortId) return null;

      const meta = cat.metadata as { sensitive?: boolean; childRelated?: boolean } | null;
      const campos = (cat.children ?? [])
        .filter((c) => c.tipo === "CAMPO_DATO" && c.activo)
        .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre))
        .map((c) => c.nombre);

      return {
        id: shortId,
        name: cat.nombre,
        description: cat.descripcion ?? "",
        fields: campos,
        sensitive: meta?.sensitive ?? false,
        childRelated: meta?.childRelated ?? false,
      };
    })
    .filter((d): d is PersonalDataDomain => d !== null);
}

function buildRelationshipsFromRelaciones(
  relaciones: CatalogoRelacion[],
  titularIdToCode: Map<number, string>,
  categoriaIdToCode: Map<number, string>,
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const rel of relaciones) {
    if (!rel.activo) continue;

    const titularCode = titularIdToCode.get(rel.origenId);
    const categoriaCode = categoriaIdToCode.get(rel.destinoId);
    if (!titularCode || !categoriaCode) continue;

    const titularShortKey = TITULAR_CODE_TO_SHORT_KEY[titularCode];
    const categoriaShortId = CATEGORIA_CODE_TO_SHORT_ID[categoriaCode];
    if (!titularShortKey || !categoriaShortId) continue;

    if (!result[titularShortKey]) result[titularShortKey] = [];
    if (!result[titularShortKey].includes(categoriaShortId)) {
      result[titularShortKey].push(categoriaShortId);
    }
  }

  return result;
}

export type DatosPersonalesData = {
  domains: PersonalDataDomain[];
  relationships: Record<string, string[]>;
  isLoading: boolean;
  isError: boolean;
};

export function useDatosPersonales(): DatosPersonalesData {
  const treeQuery = useQuery({
    queryKey: ["catalogos", "tree", "datos-personales"],
    queryFn: async () => {
      const res = await apiClient.get<TreeResponse>("/catalogos/tree", {
        params: { dominio: "DATOS_PERSONALES" },
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const relacionesQuery = useQuery({
    queryKey: ["catalogos", "relaciones", "titular-categoria"],
    queryFn: async () => {
      const res = await apiClient.get<RelacionesResponse>("/catalogos/relaciones", {
        params: { tipo: "TITULAR_CATEGORIA" },
      });
      return res.data.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = treeQuery.isLoading || relacionesQuery.isLoading;
  const isError = treeQuery.isError || relacionesQuery.isError;

  if (isLoading || isError || !treeQuery.data || !relacionesQuery.data) {
    return {
      domains: FALLBACK_DOMAINS,
      relationships: FALLBACK_RELATIONSHIPS,
      isLoading,
      isError,
    };
  }

  const tree = treeQuery.data;
  const relaciones = relacionesQuery.data;

  const datosPersonalesDominio = tree.find(
    (d) => d.dominio.toUpperCase() === "DATOS_PERSONALES",
  );

  if (!datosPersonalesDominio) {
    return {
      domains: FALLBACK_DOMAINS,
      relationships: FALLBACK_RELATIONSHIPS,
      isLoading: false,
      isError: false,
    };
  }

  // Build id maps to resolve CatalogoRelacion FK ids → DB codes
  const titularIdToCode = new Map<number, string>();
  const categoriaIdToCode = new Map<number, string>();

  for (const tipo of datosPersonalesDominio.tipos) {
    for (const item of tipo.items) {
      if (tipo.tipo === "TIPO_TITULAR") titularIdToCode.set(item.id, item.codigo);
      if (tipo.tipo === "CATEGORIA_DATO") categoriaIdToCode.set(item.id, item.codigo);
    }
  }

  const categoriaTipo = datosPersonalesDominio.tipos.find(
    (t) => t.tipo === "CATEGORIA_DATO",
  );
  const domains = buildDomainsFromTree(categoriaTipo?.items ?? []);

  if (domains.length === 0) {
    return {
      domains: FALLBACK_DOMAINS,
      relationships: FALLBACK_RELATIONSHIPS,
      isLoading: false,
      isError: false,
    };
  }

  const relationships = buildRelationshipsFromRelaciones(
    relaciones,
    titularIdToCode,
    categoriaIdToCode,
  );

  const hasRelationships = Object.keys(relationships).length > 0;

  return {
    domains,
    relationships: hasRelationships ? relationships : FALLBACK_RELATIONSHIPS,
    isLoading: false,
    isError: false,
  };
}
