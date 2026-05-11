import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AppIcon } from "../../components/AppIcon";
import { ExecutiveKpiGrid, type ExecutiveKpiItem } from "../../components/ExecutiveKpiGrid";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import {
  CATALOG_TYPE_KEYS,
  formatCatalogTypeLabel,
  type CatalogEntry,
} from "../catalogs/catalogs-data";

type AssetSummary = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  dependencia: string | null;
  siglaDependencia: string | null;
  tipoActivo: string | null;
  clasificacionInformacion: string | null;
  version: string | null;
  activo: boolean;
  confidencialidad: number | null;
  integridad: number | null;
  disponibilidad: number | null;
  valorActivo: number | null;
  impacto: string | null;
  impactoCodigo: string | null;
  totalUsos: number;
  fuentesUsuarios: string[];
};

type AssetDetail = {
  id: number;
  codigo: string;
  nombre: string;
  codigoActivoPadreExterno: string | null;
  dependenciaNombreFuente: string | null;
  siglaDependenciaFuente: string | null;
  descripcion: string | null;
  version: string | null;
  macroproceso: string | null;
  proceso: string | null;
  subproceso: string | null;
  usoOtrasAreasProcesos: string | null;
  direccionIpUrl: string | null;
  propietarioActivo: string | null;
  unidadPropietariaActivo: string | null;
  custodio: string | null;
  areaCustodio: string | null;
  ubicacion: string | null;
  controlesExistentes: string | null;
  observaciones: string | null;
  historico: string | null;
  fechaLevantamiento: string | null;
  confidencialidad: number | null;
  integridad: number | null;
  disponibilidad: number | null;
  valorActivo: number | null;
  activo: boolean;
  dependencia: { id: number; nombre: string; sigla?: string | null } | null;
  tipoActivo: { id: number; nombre: string } | null;
  nivel: { id: number; nombre: string } | null;
  ambiente: { id: number; nombre: string } | null;
  clasificacionInformacion: { id: number; nombre: string } | null;
  datosPersonales: { id: number; nombre: string } | null;
  visibleInternet: { id: number; nombre: string } | null;
  fuenteActivo: { id: number; nombre: string } | null;
  bajaProgramada: { id: number; nombre: string } | null;
  propiedadIntelectual: { id: number; nombre: string } | null;
  impacto: { id: number; nombre: string } | null;
  fuentesUsuarios: Array<{ id: number; nombre: string; orden: number }>;
};

type AssetsResponse = {
  data: AssetSummary[];
};

type AssetDetailResponse = {
  data: AssetDetail;
};

type AssetMutationResponse = {
  data: AssetDetail;
};

type Dependencia = {
  id: number;
  nombre: string;
  sigla?: string | null;
};

type DependenciasResponse = {
  data: Dependencia[];
};

type CatalogosResponse = {
  data: CatalogEntry[];
};

type AssetDraft = {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  version: string;
  dependenciaId: string;
  macroproceso: string;
  proceso: string;
  subproceso: string;
  tipoActivoId: string;
  clasificacionInfoId: string;
  nivelId: string;
  ambienteId: string;
  direccionIpUrl: string;
  propietarioActivo: string;
  unidadPropietariaActivo: string;
  custodio: string;
  areaCustodio: string;
  ubicacion: string;
  datosPersonalesId: string;
  visibleInternetId: string;
  fuenteActivoId: string;
  fuentesUsuariosText: string;
  confidencialidad: string;
  integridad: string;
  disponibilidad: string;
  controlesExistentes: string;
  bajaProgramadaId: string;
  propiedadIntelectualId: string;
  observaciones: string;
  fechaLevantamiento: string;
  activo: boolean;
};

type AssetCatalogOption = {
  id: number;
  nombre: string;
  codigo: string;
};

const INITIAL_ASSET_DRAFT: AssetDraft = {
  codigo: "",
  nombre: "",
  descripcion: "",
  version: "",
  dependenciaId: "",
  macroproceso: "",
  proceso: "",
  subproceso: "",
  tipoActivoId: "",
  clasificacionInfoId: "",
  nivelId: "",
  ambienteId: "",
  direccionIpUrl: "",
  propietarioActivo: "",
  unidadPropietariaActivo: "",
  custodio: "",
  areaCustodio: "",
  ubicacion: "",
  datosPersonalesId: "",
  visibleInternetId: "",
  fuenteActivoId: "",
  fuentesUsuariosText: "",
  confidencialidad: "",
  integridad: "",
  disponibilidad: "",
  controlesExistentes: "",
  bajaProgramadaId: "",
  propiedadIntelectualId: "",
  observaciones: "",
  fechaLevantamiento: "",
  activo: true,
};

export function AssetsPage() {
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dependenciaFilter, setDependenciaFilter] = useState(
    () => searchParams.get("dependencia") ?? "Todas",
  );
  const [tipoFilter, setTipoFilter] = useState(() => searchParams.get("tipo") ?? "Todos");
  const [impactoFilter, setImpactoFilter] = useState(
    () => normalizeImpactFilterValue(searchParams.get("impacto")),
  );
  const [estadoFilter, setEstadoFilter] = useState<"Todos" | "Activo" | "Inactivo">(
    () => (searchParams.get("estado") as "Todos" | "Activo" | "Inactivo") ?? "Todos",
  );
  const [activeAssetId, setActiveAssetId] = useState<number | "new" | null>(null);
  const [draftAsset, setDraftAsset] = useState<AssetDraft | null>(null);

  const assetsQuery = useQuery({
    queryKey: ["activos", "list"],
    queryFn: async () => {
      const response = await apiClient.get<AssetsResponse>("/activos");
      return response.data.data;
    },
  });

  const detailQuery = useQuery({
    queryKey: ["activos", "detail", activeAssetId],
    enabled: typeof activeAssetId === "number",
    queryFn: async () => {
      const response = await apiClient.get<AssetDetailResponse>(`/activos/${activeAssetId}`);
      return response.data.data;
    },
  });

  const dependenciasQuery = useQuery({
    queryKey: ["dependencias", "activos"],
    queryFn: async () => {
      const response = await apiClient.get<DependenciasResponse>("/dependencias", {
        params: { activo: true },
      });
      return response.data.data;
    },
  });

  const catalogosQuery = useQuery({
    queryKey: ["catalogos", "activos"],
    queryFn: async () => {
      const response = await apiClient.get<CatalogosResponse>("/catalogos", {
        params: { activo: true },
      });
      return response.data.data;
    },
  });

  const saveAssetMutation = useMutation({
    mutationFn: async (draft: AssetDraft) => {
      const payload = buildAssetPayload(draft);

      if (draft.id) {
        const response = await apiClient.patch<AssetMutationResponse>(
          `/activos/${draft.id}`,
          payload,
        );
        return response.data.data;
      }

      const response = await apiClient.post<AssetMutationResponse>("/activos", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["activos"] });
      setActiveAssetId(null);
      setDraftAsset(null);
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: async (assetId: number) => {
      await apiClient.delete(`/activos/${assetId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["activos"] });
      setActiveAssetId(null);
      setDraftAsset(null);
    },
  });

  const entries = assetsQuery.data ?? [];
  const dependencias = dependenciasQuery.data ?? [];
  const catalogEntries = catalogosQuery.data ?? [];
  const tipoOptions = useMemo(
    () => getCatalogOptionsByType(catalogEntries, CATALOG_TYPE_KEYS.TIPO_ACTIVO),
    [catalogEntries],
  );
  const clasificacionOptions = useMemo(
    () =>
      getCatalogOptionsByType(
        catalogEntries,
        CATALOG_TYPE_KEYS.CLASIFICACION_INFO_ACTIVO,
      ),
    [catalogEntries],
  );
  const nivelOptions = useMemo(
    () => getCatalogOptionsByType(catalogEntries, CATALOG_TYPE_KEYS.NIVEL_ACTIVO),
    [catalogEntries],
  );
  const ambienteOptions = useMemo(
    () => getCatalogOptionsByType(catalogEntries, CATALOG_TYPE_KEYS.AMBIENTE_ACTIVO),
    [catalogEntries],
  );
  const yesNoOptions = useMemo(
    () => getCatalogOptionsByType(catalogEntries, CATALOG_TYPE_KEYS.RESPUESTA_BINARIA),
    [catalogEntries],
  );
  const visibleInternetOptions = useMemo(
    () =>
      getCatalogOptionsByType(
        catalogEntries,
        CATALOG_TYPE_KEYS.VISIBILIDAD_INTERNET,
      ),
    [catalogEntries],
  );
  const fuenteActivoOptions = useMemo(
    () => getCatalogOptionsByType(catalogEntries, CATALOG_TYPE_KEYS.FUENTE_ACTIVO),
    [catalogEntries],
  );

  const filteredAssets = useMemo(() => {
    const normalizedSearch = normalize(search);

    return entries.filter((entry) => {
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalize(
          [
            entry.codigo,
            entry.nombre,
            entry.dependencia,
            entry.tipoActivo,
            entry.descripcion,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(normalizedSearch);
      const matchesDependencia =
        dependenciaFilter === "Todas" || entry.dependencia === dependenciaFilter;
      const matchesTipo = tipoFilter === "Todos" || entry.tipoActivo === tipoFilter;
      const matchesImpacto =
        impactoFilter === "Todos" || getAssetImpactKey(entry) === impactoFilter;
      const matchesEstado =
        estadoFilter === "Todos" ||
        (estadoFilter === "Activo" ? entry.activo : !entry.activo);

      return (
        matchesSearch &&
        matchesDependencia &&
        matchesTipo &&
        matchesImpacto &&
        matchesEstado
      );
    });
  }, [dependenciaFilter, entries, estadoFilter, impactoFilter, search, tipoFilter]);

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setDependenciaFilter(searchParams.get("dependencia") ?? "Todas");
    setTipoFilter(searchParams.get("tipo") ?? "Todos");
    setImpactoFilter(normalizeImpactFilterValue(searchParams.get("impacto")));
    setEstadoFilter(
      (searchParams.get("estado") as "Todos" | "Activo" | "Inactivo") ?? "Todos",
    );
  }, [searchParams]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (activeAssetId !== null) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeAssetId]);

  useEffect(() => {
    if (activeAssetId === null || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveAssetId(null);
        setDraftAsset(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeAssetId]);

  useEffect(() => {
    if (activeAssetId === "new") {
      setDraftAsset(INITIAL_ASSET_DRAFT);
      return;
    }

    if (!detailQuery.data || typeof activeAssetId !== "number") {
      return;
    }

    setDraftAsset(mapAssetDetailToDraft(detailQuery.data));
  }, [activeAssetId, detailQuery.data]);

  const dependencyOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.dependencia)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [entries],
  );
  const impactOptions = useMemo(
    () =>
      IMPACT_ORDER.filter((key) =>
        entries.some((entry) => getAssetImpactKey(entry) === key),
      ),
    [entries],
  );
  const impactCounts = useMemo(
    () => ({
      MENOR: entries.filter((entry) => getAssetImpactKey(entry) === "MENOR").length,
      MODERADO: entries.filter((entry) => getAssetImpactKey(entry) === "MODERADO").length,
      MAYOR: entries.filter((entry) => getAssetImpactKey(entry) === "MAYOR").length,
      CATASTROFICO: entries.filter((entry) => getAssetImpactKey(entry) === "CATASTROFICO").length,
    }),
    [entries],
  );
  const typeFilterOptions = useMemo(
    () =>
      Array.from(
        new Set(
          entries
            .map((entry) => entry.tipoActivo)
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort(),
    [entries],
  );

  const stats = useMemo<ExecutiveKpiItem[]>(
    () => [
      {
        label: "Total activos",
        value: entries.length,
        tone: "neutral",
        to: "/activos",
      },
      {
        label: "Menor",
        value: impactCounts.MENOR,
        tone: "success",
        to: "/activos?impacto=MENOR",
      },
      {
        label: "Moderado",
        value: impactCounts.MODERADO,
        tone: "warning",
        to: "/activos?impacto=MODERADO",
      },
      {
        label: "Mayor",
        value: impactCounts.MAYOR,
        tone: "orange",
        to: "/activos?impacto=MAYOR",
      },
      {
        label: "Catastrófico",
        value: impactCounts.CATASTROFICO,
        context: impactCounts.CATASTROFICO > 0 ? "Prioridad inmediata" : undefined,
        tone: "critical",
        emphasize: impactCounts.CATASTROFICO > 0,
        to: "/activos?impacto=CATASTROFICO",
      },
    ],
    [entries.length, impactCounts],
  );

  const activeAssetPreview = draftAsset ? calculateAssetPreview(draftAsset) : null;

  return (
    <section className="catalogs-page assets-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Inventario de informacion</span>
          <div className="page-title-with-icon">
            <span className="page-title-icon">
              <AppIcon name="assets" size={22} strokeWidth={2.1} />
            </span>
            <h2>Activos de informacion</h2>
          </div>
          <p className="page-copy">
            Consolide el inventario institucional, calcule el valor de cada activo desde C, I y D,
            y gestione custodios, fuentes y contexto tecnico desde un solo flujo.
          </p>
          <p className="permission-hint">
            Rol actual: <strong>{roleCapabilities.label}</strong>. Los activos se administran con
            baja logica y trazabilidad sobre cambios clave.
          </p>
        </div>

        <div className="registry-header-actions">
          <Link to="/catalogos/activos" className="button-secondary">
            Catalogos de activos
          </Link>
          {roleCapabilities.assets.create ? (
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                setActiveAssetId("new");
                setDraftAsset(INITIAL_ASSET_DRAFT);
              }}
            >
              Nuevo activo
            </button>
          ) : null}
        </div>
      </header>

      <ExecutiveKpiGrid items={stats} />

      <div className="org-toolbar panel">
        <label className="field">
          <span>Buscar por codigo, nombre o dependencia</span>
          <input
            className="input"
            placeholder="Ej. ACT-DNTI, IAM, documentacion"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Dependencia</span>
          <select
            className="input"
            value={dependenciaFilter}
            onChange={(event) => setDependenciaFilter(event.target.value)}
          >
            <option value="Todas">Todas</option>
            {dependencyOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Tipo de activo</span>
          <select
            className="input"
            value={tipoFilter}
            onChange={(event) => setTipoFilter(event.target.value)}
          >
            <option value="Todos">Todos</option>
            {typeFilterOptions.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Impacto</span>
          <select
            className="input"
            value={impactoFilter}
            onChange={(event) => setImpactoFilter(event.target.value)}
          >
            <option value="Todos">Todos</option>
            {impactOptions.map((item) => (
              <option key={item} value={item}>
                {formatAssetImpactLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Estado</span>
          <select
            className="input"
            value={estadoFilter}
            onChange={(event) =>
              setEstadoFilter(event.target.value as "Todos" | "Activo" | "Inactivo")
            }
          >
            <option value="Todos">Todos</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </label>
      </div>

      {assetsQuery.isError ? (
        <section className="panel access-panel">
          <span className="brand-kicker">Sin conexion de activos</span>
          <h3>Inventario no disponible</h3>
          <p className="page-copy">
            No fue posible consultar los activos desde el backend. Revise la API antes de
            continuar con la administracion del inventario.
          </p>
        </section>
      ) : null}

      <section className="panel org-admin-single">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">Inventario institucional</span>
            <h3>Activos consolidados</h3>
          </div>
          <span className="pill">{filteredAssets.length} registros filtrados</span>
        </div>

        <TableScrollFrame className="table-wrapper-matrix" maxHeight="none">
          <table className="registry-table registry-table-assets">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Activo</th>
                <th>Dependencia</th>
                <th>Tipo</th>
                <th>Clasificacion</th>
                <th>C</th>
                <th>I</th>
                <th>D</th>
                <th>Valor</th>
                <th>Impacto</th>
                <th>Uso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredAssets.map((entry) => {
                const isSelected = activeAssetId === entry.id;

                return (
                  <tr
                    key={entry.id}
                    className={
                      isSelected
                        ? "table-row-selected table-row-interactive"
                        : "table-row-interactive"
                    }
                    tabIndex={0}
                    aria-selected={isSelected}
                    aria-haspopup="dialog"
                    onClick={() => {
                      setActiveAssetId(entry.id);
                      setDraftAsset(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveAssetId(entry.id);
                        setDraftAsset(null);
                      }
                    }}
                  >
                    <td>
                      <strong>{entry.codigo}</strong>
                    </td>
                    <td>
                      <strong>{entry.nombre}</strong>
                      <div className="table-cell-secondary">
                        {entry.descripcion || "Sin descripcion registrada"}
                      </div>
                    </td>
                    <td>{entry.dependencia ?? "Sin dependencia"}</td>
                    <td>{entry.tipoActivo ?? "Sin tipo"}</td>
                    <td>{entry.clasificacionInformacion ?? "Sin clasificacion"}</td>
                    <td>{entry.confidencialidad ?? "-"}</td>
                    <td>{entry.integridad ?? "-"}</td>
                    <td>{entry.disponibilidad ?? "-"}</td>
                    <td>{formatAverage(entry.valorActivo)}</td>
                    <td>
                      <span className={getImpactPillClass(entry)}>
                        {formatAssetImpactLabel(getAssetImpactKey(entry)) ?? "Sin impacto"}
                      </span>
                    </td>
                    <td>{entry.totalUsos}</td>
                    <td>
                      <span
                        className={
                          entry.activo
                            ? "pill status-pill-vigente"
                            : "pill status-pill-archivado"
                        }
                      >
                        {entry.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScrollFrame>
      </section>

      {activeAssetId !== null ? (
        <AssetManagementModal
          canArchive={roleCapabilities.assets.archive}
          canSave={roleCapabilities.assets.update || roleCapabilities.assets.create}
          catalogEntries={catalogEntries}
          dependencias={dependencias}
          draft={draftAsset}
          impactoPreview={activeAssetPreview}
          isCreating={activeAssetId === "new"}
          isDeleting={deleteAssetMutation.isPending}
          isLoadingDetail={detailQuery.isLoading && typeof activeAssetId === "number"}
          isSaving={saveAssetMutation.isPending}
          onChange={setDraftAsset}
          onClose={() => {
            setActiveAssetId(null);
            setDraftAsset(null);
          }}
          onDelete={() => {
            if (draftAsset?.id) {
              deleteAssetMutation.mutate(draftAsset.id);
            }
          }}
          onSave={() => {
            if (draftAsset) {
              saveAssetMutation.mutate(draftAsset);
            }
          }}
          options={{
            tipoActivo: tipoOptions,
            clasificacion: clasificacionOptions,
            nivel: nivelOptions,
            ambiente: ambienteOptions,
            yesNo: yesNoOptions,
            visibilidad: visibleInternetOptions,
            fuenteActivo: fuenteActivoOptions,
          }}
        />
      ) : null}
    </section>
  );
}

function AssetManagementModal({
  canArchive,
  canSave,
  catalogEntries,
  dependencias,
  draft,
  impactoPreview,
  isCreating,
  isDeleting,
  isLoadingDetail,
  isSaving,
  onChange,
  onClose,
  onDelete,
  onSave,
  options,
}: {
  canArchive: boolean;
  canSave: boolean;
  catalogEntries: CatalogEntry[];
  dependencias: Dependencia[];
  draft: AssetDraft | null;
  impactoPreview: { valor: string; impacto: string; pillClass: string } | null;
  isCreating: boolean;
  isDeleting: boolean;
  isLoadingDetail: boolean;
  isSaving: boolean;
  onChange: (draft: AssetDraft | null) => void;
  onClose: () => void;
  onDelete: () => void;
  onSave: () => void;
  options: {
    tipoActivo: AssetCatalogOption[];
    clasificacion: AssetCatalogOption[];
    nivel: AssetCatalogOption[];
    ambiente: AssetCatalogOption[];
    yesNo: AssetCatalogOption[];
    visibilidad: AssetCatalogOption[];
    fuenteActivo: AssetCatalogOption[];
  };
}) {
  const canSubmit =
    Boolean(draft?.codigo.trim()) &&
    Boolean(draft?.nombre.trim()) &&
    Boolean(draft?.tipoActivoId.trim());

  return (
    <div className="report-preview-modal" role="dialog" aria-modal="true" aria-labelledby="asset-modal-title">
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar gestion de activo"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog report-preview-modal-dialog-wide asset-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Gestion de activos</span>
            <div className="page-title-with-icon page-title-with-icon-modal">
              <span className="page-title-icon">
                <AppIcon name="assets" size={20} strokeWidth={2.1} />
              </span>
              <h3 id="asset-modal-title">
                {isCreating ? "Nuevo activo de informacion" : draft?.nombre || "Activo de informacion"}
              </h3>
            </div>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          {isLoadingDetail || !draft ? (
            <section className="detail-block">
              <h4>Cargando detalle del activo</h4>
              <p className="selection-action-empty">
                Espere mientras se completa el formulario con la informacion registrada.
              </p>
            </section>
          ) : (
            <div className="activity-action-modal-grid asset-modal-grid">
              <div className="detail-block">
                <h4>Identificacion del activo</h4>
                <div className="catalog-form-grid">
                  <label className="field">
                    <span>Codigo</span>
                    <input
                      className="input"
                      value={draft.codigo}
                      onChange={(event) => onChange({ ...draft, codigo: event.target.value.toUpperCase() })}
                    />
                  </label>

                  <label className="field">
                    <span>Version</span>
                    <input
                      className="input"
                      value={draft.version}
                      onChange={(event) => onChange({ ...draft, version: event.target.value })}
                    />
                  </label>

                  <label className="field full-width">
                    <span>Nombre del activo</span>
                    <input
                      className="input"
                      value={draft.nombre}
                      onChange={(event) => onChange({ ...draft, nombre: event.target.value })}
                    />
                  </label>

                  <label className="field full-width">
                    <span>Descripcion</span>
                    <textarea
                      className="input textarea"
                      rows={4}
                      value={draft.descripcion}
                      onChange={(event) => onChange({ ...draft, descripcion: event.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="detail-block">
                <h4>Clasificacion y contexto</h4>
                <div className="catalog-form-grid">
                  <label className="field">
                    <span>Dependencia</span>
                    <select
                      className="input"
                      value={draft.dependenciaId}
                      onChange={(event) => onChange({ ...draft, dependenciaId: event.target.value })}
                    >
                      <option value="">Seleccione la dependencia</option>
                      {dependencias.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.sigla ? `${item.nombre} (${item.sigla})` : item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Tipo de activo</span>
                    <select
                      className="input"
                      value={draft.tipoActivoId}
                      onChange={(event) => onChange({ ...draft, tipoActivoId: event.target.value })}
                    >
                      <option value="">Seleccione el tipo</option>
                      {options.tipoActivo.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Clasificacion del activo</span>
                    <select
                      className="input"
                      value={draft.clasificacionInfoId}
                      onChange={(event) => onChange({ ...draft, clasificacionInfoId: event.target.value })}
                    >
                      <option value="">Seleccione la clasificacion</option>
                      {options.clasificacion.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Nivel</span>
                    <select
                      className="input"
                      value={draft.nivelId}
                      onChange={(event) => onChange({ ...draft, nivelId: event.target.value })}
                    >
                      <option value="">Seleccione el nivel</option>
                      {options.nivel.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Ambiente</span>
                    <select
                      className="input"
                      value={draft.ambienteId}
                      onChange={(event) => onChange({ ...draft, ambienteId: event.target.value })}
                    >
                      <option value="">Seleccione el ambiente</option>
                      {options.ambiente.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Fecha de levantamiento</span>
                    <input
                      className="input"
                      type="date"
                      value={draft.fechaLevantamiento}
                      onChange={(event) =>
                        onChange({ ...draft, fechaLevantamiento: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Macroproceso</span>
                    <input
                      className="input"
                      value={draft.macroproceso}
                      onChange={(event) => onChange({ ...draft, macroproceso: event.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Proceso</span>
                    <input
                      className="input"
                      value={draft.proceso}
                      onChange={(event) => onChange({ ...draft, proceso: event.target.value })}
                    />
                  </label>

                  <label className="field full-width">
                    <span>Subproceso</span>
                    <input
                      className="input"
                      value={draft.subproceso}
                      onChange={(event) => onChange({ ...draft, subproceso: event.target.value })}
                    />
                  </label>
                </div>
              </div>

              <div className="detail-block">
                <h4>Custodia y ubicacion</h4>
                <div className="catalog-form-grid">
                  <label className="field">
                    <span>Propietario del activo</span>
                    <input
                      className="input"
                      value={draft.propietarioActivo}
                      onChange={(event) =>
                        onChange({ ...draft, propietarioActivo: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Unidad propietaria</span>
                    <input
                      className="input"
                      value={draft.unidadPropietariaActivo}
                      onChange={(event) =>
                        onChange({ ...draft, unidadPropietariaActivo: event.target.value })
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Custodio</span>
                    <input
                      className="input"
                      value={draft.custodio}
                      onChange={(event) => onChange({ ...draft, custodio: event.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Area custodio</span>
                    <input
                      className="input"
                      value={draft.areaCustodio}
                      onChange={(event) => onChange({ ...draft, areaCustodio: event.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Ubicacion</span>
                    <input
                      className="input"
                      value={draft.ubicacion}
                      onChange={(event) => onChange({ ...draft, ubicacion: event.target.value })}
                    />
                  </label>

                  <label className="field">
                    <span>Direccion IP o URL</span>
                    <input
                      className="input"
                      value={draft.direccionIpUrl}
                      onChange={(event) => onChange({ ...draft, direccionIpUrl: event.target.value })}
                    />
                  </label>

                  <label className="field full-width">
                    <span>Usuarios fuente</span>
                    <textarea
                      className="input textarea"
                      rows={3}
                      placeholder="Separe varios nombres por coma o salto de linea"
                      value={draft.fuentesUsuariosText}
                      onChange={(event) =>
                        onChange({ ...draft, fuentesUsuariosText: event.target.value })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="detail-block">
                <h4>Datos y valoracion</h4>
                <div className="catalog-form-grid">
                  <label className="field">
                    <span>Datos personales</span>
                    <select
                      className="input"
                      value={draft.datosPersonalesId}
                      onChange={(event) =>
                        onChange({ ...draft, datosPersonalesId: event.target.value })
                      }
                    >
                      <option value="">Seleccione</option>
                      {options.yesNo.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Visible desde internet</span>
                    <select
                      className="input"
                      value={draft.visibleInternetId}
                      onChange={(event) =>
                        onChange({ ...draft, visibleInternetId: event.target.value })
                      }
                    >
                      <option value="">Seleccione</option>
                      {options.visibilidad.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Fuente del activo</span>
                    <select
                      className="input"
                      value={draft.fuenteActivoId}
                      onChange={(event) =>
                        onChange({ ...draft, fuenteActivoId: event.target.value })
                      }
                    >
                      <option value="">Seleccione la fuente</option>
                      {options.fuenteActivo.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="field asset-value-preview">
                    <span>Valor del activo</span>
                    <strong>{impactoPreview?.valor ?? "--"}</strong>
                    <small className={impactoPreview?.pillClass ?? "selection-action-empty"}>
                      {impactoPreview?.impacto ?? "Sin calcular"}
                    </small>
                  </div>

                  <label className="field">
                    <span>Confidencialidad</span>
                    <select
                      className="input"
                      value={draft.confidencialidad}
                      onChange={(event) =>
                        onChange({ ...draft, confidencialidad: event.target.value })
                      }
                    >
                      <option value="">Seleccione</option>
                      {["1", "2", "3", "4"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Integridad</span>
                    <select
                      className="input"
                      value={draft.integridad}
                      onChange={(event) => onChange({ ...draft, integridad: event.target.value })}
                    >
                      <option value="">Seleccione</option>
                      {["1", "2", "3", "4"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Disponibilidad</span>
                    <select
                      className="input"
                      value={draft.disponibilidad}
                      onChange={(event) =>
                        onChange({ ...draft, disponibilidad: event.target.value })
                      }
                    >
                      <option value="">Seleccione</option>
                      {["1", "2", "3", "4"].map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="detail-block">
                <h4>Controles y ciclo de vida</h4>
                <div className="catalog-form-grid">
                  <label className="field">
                    <span>Baja programada</span>
                    <select
                      className="input"
                      value={draft.bajaProgramadaId}
                      onChange={(event) =>
                        onChange({ ...draft, bajaProgramadaId: event.target.value })
                      }
                    >
                      <option value="">Seleccione</option>
                      {options.yesNo.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Propiedad intelectual</span>
                    <select
                      className="input"
                      value={draft.propiedadIntelectualId}
                      onChange={(event) =>
                        onChange({ ...draft, propiedadIntelectualId: event.target.value })
                      }
                    >
                      <option value="">Seleccione</option>
                      {options.yesNo.map((item) => (
                        <option key={item.id} value={String(item.id)}>
                          {item.nombre}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field full-width">
                    <span>Controles existentes</span>
                    <textarea
                      className="input textarea"
                      rows={4}
                      value={draft.controlesExistentes}
                      onChange={(event) =>
                        onChange({ ...draft, controlesExistentes: event.target.value })
                      }
                    />
                  </label>

                  <label className="field full-width">
                    <span>Observaciones</span>
                    <textarea
                      className="input textarea"
                      rows={4}
                      value={draft.observaciones}
                      onChange={(event) =>
                        onChange({ ...draft, observaciones: event.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="activity-action-modal-actions">
                  {canArchive && draft.id ? (
                    <button
                      type="button"
                      className="button-table-action button-table-action-danger"
                      disabled={isDeleting}
                      onClick={onDelete}
                    >
                      {isDeleting ? "Eliminando..." : "Eliminar activo"}
                    </button>
                  ) : null}
                  {canSave ? (
                    <button
                      type="button"
                      className="button-table-action"
                      disabled={!canSubmit || isSaving}
                      onClick={onSave}
                    >
                      {isSaving ? "Guardando..." : "Guardar activo"}
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="detail-block">
                <h4>Catalogos relacionados</h4>
                <div className="asset-linked-catalogs">
                  {buildCatalogSummary(catalogEntries, draft).map((item) => (
                    <article key={item.label} className="relationship-support-chip">
                      <strong>{item.label}</strong>
                      <span>{item.value}</span>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getCatalogOptionsByType(entries: CatalogEntry[], tipo: string): AssetCatalogOption[] {
  return entries
    .filter((entry) => entry.tipo === tipo && entry.activo)
    .map((entry) => ({
      id: Number(entry.id),
      nombre: entry.nombre,
      codigo: entry.codigo,
    }))
    .sort((left, right) => left.nombre.localeCompare(right.nombre));
}

function mapAssetDetailToDraft(detail: AssetDetail): AssetDraft {
  return {
    id: detail.id,
    codigo: detail.codigo,
    nombre: detail.nombre,
    descripcion: detail.descripcion ?? "",
    version: detail.version ?? "",
    dependenciaId: detail.dependencia ? String(detail.dependencia.id) : "",
    macroproceso: detail.macroproceso ?? "",
    proceso: detail.proceso ?? "",
    subproceso: detail.subproceso ?? "",
    tipoActivoId: detail.tipoActivo ? String(detail.tipoActivo.id) : "",
    clasificacionInfoId: detail.clasificacionInformacion
      ? String(detail.clasificacionInformacion.id)
      : "",
    nivelId: detail.nivel ? String(detail.nivel.id) : "",
    ambienteId: detail.ambiente ? String(detail.ambiente.id) : "",
    direccionIpUrl: detail.direccionIpUrl ?? "",
    propietarioActivo: detail.propietarioActivo ?? "",
    unidadPropietariaActivo: detail.unidadPropietariaActivo ?? "",
    custodio: detail.custodio ?? "",
    areaCustodio: detail.areaCustodio ?? "",
    ubicacion: detail.ubicacion ?? "",
    datosPersonalesId: detail.datosPersonales ? String(detail.datosPersonales.id) : "",
    visibleInternetId: detail.visibleInternet ? String(detail.visibleInternet.id) : "",
    fuenteActivoId: detail.fuenteActivo ? String(detail.fuenteActivo.id) : "",
    fuentesUsuariosText: detail.fuentesUsuarios.map((item) => item.nombre).join(", "),
    confidencialidad:
      detail.confidencialidad !== null ? String(detail.confidencialidad) : "",
    integridad: detail.integridad !== null ? String(detail.integridad) : "",
    disponibilidad:
      detail.disponibilidad !== null ? String(detail.disponibilidad) : "",
    controlesExistentes: detail.controlesExistentes ?? "",
    bajaProgramadaId: detail.bajaProgramada ? String(detail.bajaProgramada.id) : "",
    propiedadIntelectualId: detail.propiedadIntelectual
      ? String(detail.propiedadIntelectual.id)
      : "",
    observaciones: detail.observaciones ?? "",
    fechaLevantamiento: detail.fechaLevantamiento
      ? detail.fechaLevantamiento.slice(0, 10)
      : "",
    activo: detail.activo,
  };
}

function buildAssetPayload(draft: AssetDraft) {
  const isEditing = Boolean(draft.id);

  return {
    codigo: draft.codigo.trim(),
    nombre: draft.nombre.trim(),
    descripcion: toOptionalString(draft.descripcion),
    version: toOptionalString(draft.version),
    dependenciaId: toRelationValue(draft.dependenciaId, isEditing),
    macroproceso: toOptionalString(draft.macroproceso),
    proceso: toOptionalString(draft.proceso),
    subproceso: toOptionalString(draft.subproceso),
    tipoActivoId: toRelationValue(draft.tipoActivoId, isEditing),
    clasificacionInfoId: toRelationValue(draft.clasificacionInfoId, isEditing),
    nivelId: toRelationValue(draft.nivelId, isEditing),
    ambienteId: toRelationValue(draft.ambienteId, isEditing),
    direccionIpUrl: toOptionalString(draft.direccionIpUrl),
    propietarioActivo: toOptionalString(draft.propietarioActivo),
    unidadPropietariaActivo: toOptionalString(draft.unidadPropietariaActivo),
    custodio: toOptionalString(draft.custodio),
    areaCustodio: toOptionalString(draft.areaCustodio),
    ubicacion: toOptionalString(draft.ubicacion),
    datosPersonalesId: toRelationValue(draft.datosPersonalesId, isEditing),
    visibleInternetId: toRelationValue(draft.visibleInternetId, isEditing),
    fuenteActivoId: toRelationValue(draft.fuenteActivoId, isEditing),
    fuentesUsuarios: splitMultipleNames(draft.fuentesUsuariosText),
    confidencialidad: toNumberValue(draft.confidencialidad),
    integridad: toNumberValue(draft.integridad),
    disponibilidad: toNumberValue(draft.disponibilidad),
    controlesExistentes: toOptionalString(draft.controlesExistentes),
    bajaProgramadaId: toRelationValue(draft.bajaProgramadaId, isEditing),
    propiedadIntelectualId: toRelationValue(draft.propiedadIntelectualId, isEditing),
    observaciones: toOptionalString(draft.observaciones),
    fechaLevantamiento: draft.fechaLevantamiento || undefined,
    activo: draft.activo,
  };
}

function calculateAssetPreview(draft: AssetDraft) {
  const values = [
    toNumberValue(draft.confidencialidad),
    toNumberValue(draft.integridad),
    toNumberValue(draft.disponibilidad),
  ];

  if (values.some((value) => value === undefined)) {
    return null;
  }

  const average =
    ((values[0] ?? 0) + (values[1] ?? 0) + (values[2] ?? 0)) / 3;

  if (average <= 1) {
    return {
      valor: average.toFixed(2),
      impacto: "Menor",
      pillClass: "pill impact-pill-menor",
    };
  }

  if (average <= 2) {
    return {
      valor: average.toFixed(2),
      impacto: "Moderado",
      pillClass: "pill impact-pill-moderado",
    };
  }

  if (average <= 3) {
    return {
      valor: average.toFixed(2),
      impacto: "Mayor",
      pillClass: "pill impact-pill-mayor",
    };
  }

  return {
    valor: average.toFixed(2),
    impacto: "Catastrófico",
    pillClass: "pill impact-pill-catastrofico",
  };
}

function buildCatalogSummary(entries: CatalogEntry[], draft: AssetDraft) {
  const byId = new Map(entries.map((entry) => [String(entry.id), entry]));

  return [
    {
      label: "Tipo de activo",
      value: byId.get(draft.tipoActivoId)?.nombre ?? "Pendiente",
    },
    {
      label: "Nivel",
      value: byId.get(draft.nivelId)?.nombre ?? "Pendiente",
    },
    {
      label: "Ambiente",
      value: byId.get(draft.ambienteId)?.nombre ?? "Pendiente",
    },
    {
      label: "Clasificacion",
      value: byId.get(draft.clasificacionInfoId)?.nombre ?? "Pendiente",
    },
    {
      label: "Datos personales",
      value: byId.get(draft.datosPersonalesId)?.nombre ?? "Pendiente",
    },
    {
      label: "Visible desde internet",
      value: byId.get(draft.visibleInternetId)?.nombre ?? "Pendiente",
    },
  ];
}

function formatAverage(value: number | null) {
  return value === null ? "-" : value.toFixed(2);
}

type AssetImpactKey = "MENOR" | "MODERADO" | "MAYOR" | "CATASTROFICO";

const IMPACT_ORDER: AssetImpactKey[] = [
  "MENOR",
  "MODERADO",
  "MAYOR",
  "CATASTROFICO",
];

function getImpactPillClass(entry: Pick<AssetSummary, "impacto" | "impactoCodigo">) {
  switch (getAssetImpactKey(entry)) {
    case "MENOR":
      return "pill impact-pill-menor";
    case "MODERADO":
      return "pill impact-pill-moderado";
    case "MAYOR":
      return "pill impact-pill-mayor";
    case "CATASTROFICO":
      return "pill impact-pill-catastrofico";
    default:
      return "pill pill-muted";
  }
}

function getAssetImpactKey(entry: Pick<AssetSummary, "impacto" | "impactoCodigo">) {
  const normalizedCode = normalize(entry.impactoCodigo ?? "");

  switch (normalizedCode) {
    case "menor":
      return "MENOR";
    case "moderado":
      return "MODERADO";
    case "mayor":
      return "MAYOR";
    case "catastrofico":
      return "CATASTROFICO";
    default:
      break;
  }

  const normalizedImpact = normalize(entry.impacto ?? "");

  switch (normalizedImpact) {
    case "menor":
      return "MENOR";
    case "moderado":
      return "MODERADO";
    case "mayor":
      return "MAYOR";
    case "catastrofico":
      return "CATASTROFICO";
    default:
      return null;
  }
}

function normalizeImpactFilterValue(value: string | null) {
  if (!value || value === "Todos") {
    return "Todos";
  }

  switch (normalize(value)) {
    case "menor":
      return "MENOR";
    case "moderado":
      return "MODERADO";
    case "mayor":
      return "MAYOR";
    case "catastrofico":
      return "CATASTROFICO";
    default:
      return value;
  }
}

function formatAssetImpactLabel(impact: AssetImpactKey | null) {
  switch (impact) {
    case "MENOR":
      return "Menor";
    case "MODERADO":
      return "Moderado";
    case "MAYOR":
      return "Mayor";
    case "CATASTROFICO":
      return "Catastrófico";
    default:
      return null;
  }
}

function toOptionalString(value: string) {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function toRelationValue(value: string, isEditing: boolean) {
  if (!value.trim()) {
    return isEditing ? 0 : undefined;
  }

  return Number(value);
}

function toNumberValue(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  return Number(value);
}

function splitMultipleNames(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[\n,;]+/)
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
