import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import {
  CATALOG_TYPE_KEYS,
  getCatalogNamesByType,
  type CatalogEntry,
} from "../catalogs/catalogs-data";
import { getOrganizationUnits } from "../organization/organization-structure-data";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./SearchableSelect";
import {
  clearTreatmentDraft,
  loadTreatmentDraft,
  type TreatmentDraftMode,
} from "./treatment-draft-storage";
import {
  buildRegistryWorkspace,
  upsertWorkspaceRatRecord,
} from "./registry-workspace";
import {
  getRatRegistryRecords,
  type ActivityRegistryRecord,
  type RatRegistryRecord,
  type RecordStatus,
  type RiskLevel,
} from "./rat-registry-data";
import {
  ACTION_OPTIONS,
  BASE_LEGAL_OPTIONS,
  COUNTRY_OPTIONS,
  DATA_CATEGORY_OPTIONS,
  DATA_ORIGIN_OPTIONS,
  FREQUENCY_OPTIONS,
  RAT_FORM_STEPS,
  RETENTION_PATTERN_OPTIONS,
  SCOPE_OPTIONS,
  SPECIAL_DATA_CATEGORIES,
  THIRD_PARTY_CATEGORY_OPTIONS,
  TITULARES_OPTIONS,
  VOLUME_OPTIONS,
  YES_NO_OPTIONS,
} from "./rat-form-options";

type Dependencia = {
  id: number;
  nombre: string;
  sigla?: string | null;
  activo?: boolean | null;
  tipoProceso?: {
    id: number;
    nombre: string;
  } | null;
};

type DependenciasResponse = {
  data: Dependencia[];
};

type Subdireccion = {
  id: number;
  nombre: string;
  sigla?: string | null;
  activo?: boolean | null;
};

type SubdireccionesResponse = {
  data: Subdireccion[];
};

type CatalogosResponse = {
  data: CatalogEntry[];
};

type ActivoSummary = {
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
  valorActivo: number | null;
  impacto: string | null;
};

type ActivosResponse = {
  data: ActivoSummary[];
};

type RatDraftForm = {
  nombreTratamiento: string;
  dependenciaId: string;
  subdireccionId: string;
  descripcion: string;
  finalidad: string;
  baseLegal: string;
  descripcionBaseLegal: string;
  titulares: string[];
  categoriasDatos: string[];
  descripcionDatos: string;
  procedenciaDatos: string;
  accionesTratamiento: string[];
  volumenTitulares: string;
  frecuenciaTratamiento: string;
  permanenciaTratamiento: string;
  alcanceGeografico: string;
  accesoTransferencia: string;
  nombreTercero: string;
  categoriaTercero: string;
  contactoTercero: string;
  paisTercero: string;
  baseLegalTransferencia: string;
  plazoRetencion: string;
  fechaLevantamiento: string;
  fechaActualizacion: string;
  medidasSeguridad: string;
  usoPerfiles: string;
  descripcionPerfilamiento: string;
  activoElectronico: string;
  activoFisico: string;
  categoriaActivo: string;
  baseDatos: string;
  observacionRiesgo: string;
};

type StepProgress = {
  completed: number;
  total: number;
};

const TODAY = new Date().toISOString().slice(0, 10);

const INITIAL_FORM: RatDraftForm = {
  nombreTratamiento: "",
  dependenciaId: "",
  subdireccionId: "",
  descripcion: "",
  finalidad: "",
  baseLegal: "",
  descripcionBaseLegal: "",
  titulares: [],
  categoriasDatos: [],
  descripcionDatos: "",
  procedenciaDatos: "",
  accionesTratamiento: [],
  volumenTitulares: "",
  frecuenciaTratamiento: "",
  permanenciaTratamiento: "",
  alcanceGeografico: "",
  accesoTransferencia: "NO",
  nombreTercero: "",
  categoriaTercero: "",
  contactoTercero: "",
  paisTercero: "Ecuador",
  baseLegalTransferencia: "",
  plazoRetencion: "",
  fechaLevantamiento: TODAY,
  fechaActualizacion: TODAY,
  medidasSeguridad: "",
  usoPerfiles: "NO",
  descripcionPerfilamiento: "",
  activoElectronico: "",
  activoFisico: "",
  categoriaActivo: "",
  baseDatos: "",
  observacionRiesgo: "",
};

const STEP_REQUIREMENTS: Array<Array<(form: RatDraftForm) => boolean>> = [
  [
    (form) => form.nombreTratamiento.trim().length > 0,
    (form) => form.dependenciaId.length > 0,
    (form) => form.descripcion.trim().length > 0,
  ],
  [
    (form) => form.finalidad.trim().length > 0,
    (form) => form.baseLegal.length > 0,
  ],
  [(form) => form.titulares.length > 0],
  [(form) => form.categoriasDatos.length > 0],
  [
    (form) => form.procedenciaDatos.length > 0,
    (form) => form.accionesTratamiento.length > 0,
    (form) => form.volumenTitulares.length > 0,
  ],
  [],
  [(form) => form.plazoRetencion.trim().length > 0],
  [(form) => form.medidasSeguridad.trim().length > 0],
  [],
  [],
];

export function RatCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const routeMode = searchParams.get("mode");
  const draftMode: "create" | TreatmentDraftMode =
    routeMode === "edit" || routeMode === "duplicate" ? routeMode : "create";
  const draftPayload = useMemo(
    () => (draftMode === "create" ? null : loadTreatmentDraft()),
    [draftMode],
  );
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<RatDraftForm>(() =>
    draftPayload ? { ...INITIAL_FORM, ...coerceDraftValues(draftPayload.values) } : INITIAL_FORM,
  );
  const activeOrganizationLookup = useMemo(() => buildActiveOrganizationLookup(), []);
  const registryRecords = useMemo(() => buildRegistryWorkspace(getRatRegistryRecords()), []);

  const dependenciasQuery = useQuery({
    queryKey: ["dependencias", "rat-form"],
    queryFn: async () => {
      const response = await apiClient.get<DependenciasResponse>("/dependencias", {
        params: { activo: true },
      });

      return response.data.data;
    },
  });

  const subdireccionesQuery = useQuery({
    queryKey: ["subdirecciones", form.dependenciaId],
    enabled: form.dependenciaId.length > 0,
    queryFn: async () => {
      const response = await apiClient.get<SubdireccionesResponse>(
        `/dependencias/${form.dependenciaId}/subdirecciones`,
      );

      return response.data.data;
    },
  });

  const catalogosQuery = useQuery({
    queryKey: ["catalogos", "rat-form"],
    queryFn: async () => {
      const response = await apiClient.get<CatalogosResponse>("/catalogos", {
        params: { activo: true },
      });

      return response.data.data;
    },
  });

  const activosQuery = useQuery({
    queryKey: ["activos", "rat-form", form.dependenciaId],
    enabled: form.dependenciaId.length > 0,
    queryFn: async () => {
      const response = await apiClient.get<ActivosResponse>("/activos", {
        params: {
          dependenciaId: Number(form.dependenciaId),
          activo: true,
        },
      });

      return response.data.data;
    },
  });

  const dependencias = (dependenciasQuery.data ?? []).filter((item) =>
    isUnitAvailableForRegistration(item, activeOrganizationLookup),
  );
  const subdirecciones = (subdireccionesQuery.data ?? []).filter((item) =>
    isUnitAvailableForRegistration(item, activeOrganizationLookup),
  );
  const selectedDependencia =
    dependencias.find((item) => String(item.id) === form.dependenciaId) ?? null;
  const selectedSubdireccion =
    subdirecciones.find((item) => String(item.id) === form.subdireccionId) ?? null;
  const dependenciaOptions = dependencias.map<SearchableSelectOption>((item) => ({
    value: String(item.id),
    label: item.nombre,
    tag: item.sigla,
    meta: item.tipoProceso?.nombre ?? undefined,
    searchText: item.tipoProceso?.nombre ?? "",
  }));
  const subdireccionOptions = subdirecciones.map<SearchableSelectOption>((item) => ({
    value: String(item.id),
    label: item.nombre,
    tag: item.sigla,
  }));
  const catalogEntries = catalogosQuery.data ?? [];
  const baseLegalOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.BASE_LICITUD,
    BASE_LEGAL_OPTIONS,
  );
  const titularesOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.TIPO_TITULAR,
    TITULARES_OPTIONS,
  );
  const dataCategoryOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.CATEGORIA_DATO,
    DATA_CATEGORY_OPTIONS,
  );
  const dataOriginOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.ORIGEN_DATO,
    DATA_ORIGIN_OPTIONS,
  );
  const actionOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.ACCION_TRATAMIENTO,
    ACTION_OPTIONS,
  );
  const volumeOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.VOLUMEN_TRATAMIENTO,
    VOLUME_OPTIONS,
  );
  const frequencyOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.FRECUENCIA_TRATAMIENTO,
    FREQUENCY_OPTIONS,
  );
  const retentionPatternOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.PATRON_CONSERVACION,
    RETENTION_PATTERN_OPTIONS,
  );
  const scopeOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.ALCANCE_GEOGRAFICO,
    SCOPE_OPTIONS,
  );
  const yesNoOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.RESPUESTA_BINARIA,
    YES_NO_OPTIONS,
  );
  const thirdPartyCategoryOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.CATEGORIA_TERCERO,
    THIRD_PARTY_CATEGORY_OPTIONS,
  );
  const countryOptions = getCatalogNamesByType(
    catalogEntries,
    CATALOG_TYPE_KEYS.PAIS,
    COUNTRY_OPTIONS,
  );
  const dependencyAssets = useMemo(() => activosQuery.data ?? [], [activosQuery.data]);
  const selectedElectronicAsset =
    dependencyAssets.find((item) => String(item.id) === form.activoElectronico) ?? null;
  const selectedElectronicAssetType = selectedElectronicAsset?.tipoActivo ?? form.categoriaActivo;
  const electronicAssetOptions = dependencyAssets.map<SearchableSelectOption>((item) => ({
    value: String(item.id),
    label: item.nombre,
    tag: item.codigo,
    meta: [item.tipoActivo, item.clasificacionInformacion].filter(Boolean).join(" · ") || undefined,
    searchText: [item.dependencia, item.siglaDependencia, item.descripcion, item.impacto]
      .filter(Boolean)
      .join(" "),
  }));

  const generatedCode = buildRatCode(selectedDependencia?.sigla ?? null);
  const currentStep = RAT_FORM_STEPS[activeStep];
  const stepProgress = STEP_REQUIREMENTS.map((checks) => getStepProgress(form, checks));
  const completedRequired = stepProgress.reduce((sum, item) => sum + item.completed, 0);
  const totalRequired = stepProgress.reduce((sum, item) => sum + item.total, 0);
  const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const progressTone = getProgressTone(progress);
  const nextLifecycleStatus = getDraftLifecycleStatus(progress);

  const hasSpecialCategories = form.categoriasDatos.some((item) =>
    SPECIAL_DATA_CATEGORIES.includes(item),
  );
  const isLargeScale =
    form.volumenTitulares === "10001 a 100000" ||
    form.volumenTitulares === "100001 en adelante";
  const hasInternationalTransfer =
    form.accesoTransferencia === "SI" && form.paisTercero !== "Ecuador";
  const eipdRecommended =
    hasSpecialCategories || isLargeScale || hasInternationalTransfer;
  const sourceRat =
    draftPayload
      ? registryRecords.find((rat) =>
          rat.activities.some((activity) => activity.id === draftPayload.activityId),
        ) ?? null
      : null;
  const sourceActivity =
    draftPayload
      ? sourceRat?.activities.find((activity) => activity.id === draftPayload.activityId) ?? null
      : null;

  const summaryItems = [
    { label: "Codigo", value: generatedCode },
    {
      label: "Dependencia",
      value: selectedDependencia
        ? formatOrgLabel(selectedDependencia.nombre, selectedDependencia.sigla)
        : "Sin definir",
    },
    {
      label: "Dependencia ejecutora",
      value: selectedSubdireccion
        ? formatOrgLabel(selectedSubdireccion.nombre, selectedSubdireccion.sigla)
        : "Sin definir",
    },
    {
      label: "Proceso",
      value: selectedDependencia?.tipoProceso?.nombre ?? "Pendiente",
    },
  ];

  useEffect(() => {
    if (draftMode === "create") {
      clearTreatmentDraft();
    }
  }, [draftMode]);

  useEffect(() => {
    if (!draftPayload || draftMode === "create" || form.dependenciaId || dependencias.length === 0) {
      return;
    }

    const matchedDependencia = dependencias.find(
      (item) =>
        normalizeOrgKey(item.nombre) === normalizeOrgKey(draftPayload.dependenciaNombre) ||
        Boolean(
          item.sigla?.trim() &&
            normalizeOrgKey(item.sigla) === normalizeOrgKey(draftPayload.dependenciaNombre),
        ),
    );

    if (matchedDependencia) {
      setForm((current) =>
        current.dependenciaId
          ? current
          : { ...current, dependenciaId: String(matchedDependencia.id) },
      );
    }
  }, [dependencias, draftMode, draftPayload, form.dependenciaId]);

  useEffect(() => {
    if (
      !draftPayload ||
      draftMode === "create" ||
      !form.dependenciaId ||
      form.subdireccionId ||
      subdirecciones.length === 0
    ) {
      return;
    }

    const matchedSubdireccion = subdirecciones.find(
      (item) =>
        normalizeOrgKey(item.nombre) === normalizeOrgKey(draftPayload.unidadEjecutoraNombre) ||
        Boolean(
          item.sigla?.trim() &&
            normalizeOrgKey(item.sigla) === normalizeOrgKey(draftPayload.unidadEjecutoraNombre),
        ),
    );

    if (matchedSubdireccion) {
      setForm((current) =>
        current.subdireccionId
          ? current
          : { ...current, subdireccionId: String(matchedSubdireccion.id) },
      );
    }
  }, [
    draftMode,
    draftPayload,
    form.dependenciaId,
    form.subdireccionId,
    subdirecciones,
  ]);

  useEffect(() => {
    if (!form.activoElectronico) {
      return;
    }

    const exists = dependencyAssets.some(
      (item) => String(item.id) === form.activoElectronico,
    );

    if (!exists) {
      const matchedAsset = dependencyAssets.find(
        (item) =>
          normalizeOrgKey(item.nombre) === normalizeOrgKey(form.activoElectronico) ||
          normalizeOrgKey(item.codigo) === normalizeOrgKey(form.activoElectronico),
      );

      if (matchedAsset) {
        setForm((current) => ({
          ...current,
          activoElectronico: String(matchedAsset.id),
          categoriaActivo: matchedAsset.tipoActivo ?? "",
        }));
        return;
      }

      setForm((current) => ({
        ...current,
        activoElectronico: "",
        categoriaActivo: "",
      }));
    }
  }, [dependencyAssets, form.activoElectronico]);

  if (!roleCapabilities.activities.create && draftMode === "create") {
    return (
      <section className="panel access-panel">
        <span className="brand-kicker">Acceso restringido</span>
        <h2>Nuevo tratamiento</h2>
        <p className="page-copy">
          Este formulario queda habilitado para perfiles que pueden crear o actualizar
          tratamientos dentro del nucleo operativo.
        </p>
      </section>
    );
  }

  if ((draftMode === "edit" || draftMode === "duplicate") && !draftPayload) {
    return (
      <section className="panel access-panel">
        <span className="brand-kicker">Borrador no disponible</span>
        <h2>Tratamiento no encontrado</h2>
        <p className="page-copy">
          La accion solicitada no tiene un tratamiento base precargado. Regrese a la matriz
          operativa y vuelva a abrir la accion desde una fila valida.
        </p>
        <div className="actions">
          <button type="button" className="button-primary" onClick={() => navigate("/actividades")}>
            Volver a actividades
          </button>
        </div>
      </section>
    );
  }

  function handleSaveDraft() {
    const savedRecord = buildRatRecordFromForm({
      form,
      mode: draftMode,
      progress,
      generatedCode,
      selectedDependencia,
      selectedSubdireccion,
      selectedElectronicAsset,
      eipdRecommended,
      sourceRat,
      sourceActivity,
      actorName: user?.nombre?.trim() || user?.username?.trim() || "Responsable del levantamiento",
      registryRecords,
    });

    upsertWorkspaceRatRecord(savedRecord);
    clearTreatmentDraft();
    navigate("/actividades");
  }

  return (
    <section className="wizard-experience">
      <header className="page-header page-header-inline wizard-page-header">
        <div>
          <span className="brand-kicker">Actividades de tratamiento</span>
          <h2>
            {draftMode === "edit"
              ? "Editar tratamiento"
              : draftMode === "duplicate"
                ? "Duplicar tratamiento"
                : "Nuevo tratamiento"}
          </h2>
          {draftPayload ? (
            <p className="permission-hint">
              Fuente cargada: <strong>{draftPayload.sourceLabel}</strong>
            </p>
          ) : null}
        </div>

        <div className="wizard-toolbar">
          <Link to="/actividades" className="button-secondary">
            Volver a actividades
          </Link>
          <span className={`status-pill status-pill-${normalizeStatusToken(nextLifecycleStatus)}`}>
            {nextLifecycleStatus === "En revision" ? "EN REVISION" : "BORRADOR"}
          </span>
          <button type="button" className="button-secondary" onClick={handleSaveDraft}>
            {getSaveDraftLabel(draftMode, nextLifecycleStatus)}
          </button>
        </div>
      </header>

      <section className="panel wizard-overview">
        <div className="wizard-overview-row">
          <span className="wizard-overview-label">Progreso del registro</span>
          <strong className="wizard-progress-value">{progress}%</strong>
        </div>

        <div
          className="progress-bar wizard-progress-bar"
          style={{ ["--wizard-progress-tone" as string]: progressTone }}
        >
          <span style={{ width: `${progress}%` }} />
        </div>

        <div className="wizard-summary-grid">
          {summaryItems.map((item) => (
            <article key={item.label} className="wizard-summary-card">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <div className="wizard-layout wizard-layout-refined">
        <aside className="panel wizard-rail">
          <div className="wizard-rail-header">
            <span className="brand-kicker">Secciones</span>
          </div>

          {RAT_FORM_STEPS.map((item, index) => {
            const itemProgress = stepProgress[index];
            const stepStatus = getStepStatus(index, activeStep, itemProgress);

            return (
              <button
                key={item.title}
                type="button"
                className={`wizard-step-card wizard-step-card-${stepStatus}`}
                onClick={() => setActiveStep(index)}
              >
                <span className="wizard-step-index">{index + 1}</span>
                <span className="wizard-step-copy">
                  <strong>{item.title}</strong>
                </span>
              </button>
            );
          })}
        </aside>

        <div className="wizard-main">
          <section className="panel wizard-stage">
            <div className="wizard-stage-header">
              <div>
                <h3>{currentStep.title}</h3>
              </div>
            </div>

            {dependenciasQuery.isError ? (
              <div className="error-box">
                No fue posible cargar la estructura organica. Revise el backend
                antes de registrar una nueva actividad.
              </div>
            ) : null}

            {catalogosQuery.isError ? (
              <div className="error-box">
                No fue posible cargar las tablas maestras. Revise el backend
                antes de continuar con el registro del tratamiento.
              </div>
            ) : null}

            {activeStep === 0 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Contexto organizacional"
                  description="Selecciona primero la dependencia responsable para activar la dependencia ejecutora correspondiente."
                >
                  <div className="form-grid form-grid-3">
                    <div className="field">
                      <span>Dependencia responsable</span>
                      <SearchableSelect
                        value={form.dependenciaId}
                        options={dependenciaOptions}
                        placeholder={
                          dependenciasQuery.isLoading
                            ? "Cargando dependencias..."
                            : "Seleccione la dependencia responsable"
                        }
                        searchPlaceholder="Busque por nombre, sigla o tipo de proceso"
                        emptyMessage="No hay dependencias que coincidan con la busqueda."
                        disabled={dependenciasQuery.isLoading}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            dependenciaId: value,
                            subdireccionId: "",
                            activoElectronico: "",
                          }))
                        }
                      />
                    </div>

                    <label className="field">
                      <span>Tipo de proceso</span>
                      <input
                        className="input readonly-field"
                        readOnly
                        value={selectedDependencia?.tipoProceso?.nombre ?? "Pendiente"}
                      />
                    </label>

                    <div className="field">
                      <span>Dependencia ejecutora</span>
                      <SearchableSelect
                        value={form.subdireccionId}
                        options={subdireccionOptions}
                        placeholder={
                          form.dependenciaId.length === 0
                            ? "Pendiente"
                            : subdireccionesQuery.isLoading
                              ? "Cargando dependencias ejecutoras..."
                              : "Seleccione la dependencia ejecutora"
                        }
                        searchPlaceholder="Busque por nombre o sigla"
                        emptyMessage="No hay dependencias ejecutoras registradas para esta dependencia."
                        disabled={
                          form.dependenciaId.length === 0 || subdireccionesQuery.isLoading
                        }
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            subdireccionId: value,
                          }))
                        }
                      />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Descripcion de la actividad"
                  description="Captura el nombre de negocio y una descripcion ejecutiva de lo que hace esta actividad."
                >
                  <div className="form-grid">
                    <label className="field full-width">
                      <span>Nombre del tratamiento</span>
                      <input
                        className="input"
                        placeholder="Ej. Gestion de afiliacion de empleadores"
                        value={form.nombreTratamiento}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            nombreTratamiento: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="field full-width">
                      <span>Descripcion del tratamiento</span>
                      <textarea
                        className="input textarea"
                        rows={5}
                        placeholder="Describa en que consiste el tratamiento, que hace la unidad y cual es su alcance operativo."
                        value={form.descripcion}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            descripcion: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 1 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Finalidad especifica"
                  description="Resume el proposito real de la actividad y el valor operativo que presta."
                >
                  <label className="field full-width">
                    <span>Finalidad del tratamiento</span>
                    <textarea
                      className="input textarea"
                      rows={5}
                      placeholder="Explique la finalidad especifica del tratamiento de datos personales."
                      value={form.finalidad}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, finalidad: event.target.value }))
                      }
                    />
                  </label>
                </SectionCard>

                <SectionCard
                  title="Base de licitud"
                  description="Selecciona la base de licitud principal y agrega el respaldo normativo o institucional."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Base de licitud</span>
                      <select
                        className="input"
                        value={form.baseLegal}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, baseLegal: event.target.value }))
                        }
                      >
                        <option value="">Seleccione la base de licitud</option>
                        {baseLegalOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field full-width">
                      <span>Descripcion de base de licitud</span>
                      <textarea
                        className="input textarea"
                        rows={7}
                        placeholder="Pegue o resuma la norma, resolucion o fundamento juridico que soporta el tratamiento."
                        value={form.descripcionBaseLegal}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            descripcionBaseLegal: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Titulares involucrados"
                  description="Marca unicamente los grupos de personas cuyos datos son tratados en esta actividad."
                >
                  <ChoiceGroup
                    options={titularesOptions}
                    selected={form.titulares}
                    onToggle={(value) =>
                      setForm((current) => ({
                        ...current,
                        titulares: toggleValue(current.titulares, value),
                      }))
                    }
                  />
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 3 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Categorias de datos personales"
                  description="Selecciona las categorias tratadas y luego detalla los campos mas relevantes."
                >
                  <ChoiceGroup
                    options={dataCategoryOptions}
                    selected={form.categoriasDatos}
                    onToggle={(value) =>
                      setForm((current) => ({
                        ...current,
                        categoriasDatos: toggleValue(current.categoriasDatos, value),
                      }))
                    }
                  />

                  <label className="field full-width">
                    <span>Descripcion de datos personales</span>
                    <textarea
                      className="input textarea"
                      rows={6}
                      placeholder="Ej. Nombres, apellidos, NUI, correo institucional, historia laboral."
                      value={form.descripcionDatos}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          descripcionDatos: event.target.value,
                        }))
                      }
                    />
                  </label>
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 4 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Origen y escala del tratamiento"
                  description="Primero define de donde vienen los datos y que volumen operativo maneja la actividad."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Procedencia de los datos</span>
                      <select
                        className="input"
                        value={form.procedenciaDatos}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            procedenciaDatos: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccione la procedencia</option>
                        {dataOriginOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Numero de titulares en 12 meses</span>
                      <select
                        className="input"
                        value={form.volumenTitulares}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            volumenTitulares: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccione el volumen</option>
                        {volumeOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Frecuencia del tratamiento</span>
                      <select
                        className="input"
                        value={form.frecuenciaTratamiento}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            frecuenciaTratamiento: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccione la frecuencia</option>
                        {frequencyOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Permanencia del tratamiento</span>
                      <select
                        className="input"
                        value={form.permanenciaTratamiento}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            permanenciaTratamiento: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccione la permanencia</option>
                        {retentionPatternOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Alcance geografico</span>
                      <select
                        className="input"
                        value={form.alcanceGeografico}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            alcanceGeografico: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccione el alcance</option>
                        {scopeOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Acciones sobre los datos"
                  description="Marca las operaciones que efectivamente realiza la actividad sobre los datos personales."
                >
                  <ChoiceGroup
                    options={actionOptions}
                    selected={form.accionesTratamiento}
                    onToggle={(value) =>
                      setForm((current) => ({
                        ...current,
                        accionesTratamiento: toggleValue(current.accionesTratamiento, value),
                      }))
                    }
                  />
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 5 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Relacion con terceros"
                  description="Indica si existe acceso, encargo o transferencia. Solo si la respuesta es afirmativa se habilita el detalle."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Acceso, encargo o transferencia</span>
                      <select
                        className="input"
                        value={form.accesoTransferencia}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            accesoTransferencia: event.target.value,
                          }))
                        }
                      >
                        {yesNoOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Detalle de tercero o transferencia"
                  description="Completa esta informacion solo cuando existe una relacion externa real."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Categoria de tercero</span>
                      <select
                        className="input"
                        disabled={form.accesoTransferencia !== "SI"}
                        value={form.categoriaTercero}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            categoriaTercero: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccione la categoria</option>
                        {thirdPartyCategoryOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field">
                      <span>Nombre del tercero</span>
                      <input
                        className="input"
                        disabled={form.accesoTransferencia !== "SI"}
                        value={form.nombreTercero}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            nombreTercero: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Datos de contacto del tercero</span>
                      <input
                        className="input"
                        disabled={form.accesoTransferencia !== "SI"}
                        value={form.contactoTercero}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            contactoTercero: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Pais del tercero</span>
                      <select
                        className="input"
                        disabled={form.accesoTransferencia !== "SI"}
                        value={form.paisTercero}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            paisTercero: event.target.value,
                          }))
                        }
                      >
                        {countryOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field full-width">
                      <span>Base de licitud para transferencia exterior</span>
                      <textarea
                        className="input textarea"
                        rows={5}
                        disabled={form.accesoTransferencia !== "SI"}
                        value={form.baseLegalTransferencia}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            baseLegalTransferencia: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 6 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Conservacion y fechas de control"
                  description="Define el criterio de retencion y las fechas que ayudaran a gobernar el ciclo de vida de la actividad."
                >
                  <div className="form-grid">
                    <label className="field full-width">
                      <span>Plazo de retencion</span>
                      <input
                        className="input"
                        placeholder="Ej. Hasta cumplir con la finalidad del tratamiento"
                        value={form.plazoRetencion}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            plazoRetencion: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Fecha de levantamiento inicial</span>
                      <input
                        className="input"
                        type="date"
                        value={form.fechaLevantamiento}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fechaLevantamiento: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Fecha de ultima actualizacion</span>
                      <input
                        className="input"
                        type="date"
                        value={form.fechaActualizacion}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            fechaActualizacion: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 7 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Controles generales"
                  description="Resume de forma ejecutiva los controles tecnicos, administrativos y fisicos ya implementados."
                >
                  <label className="field full-width">
                    <span>Descripcion general de medidas de seguridad</span>
                    <textarea
                      className="input textarea"
                      rows={6}
                      placeholder="Ej. Compromiso de confidencialidad, control de accesos, segregacion, cifrado."
                      value={form.medidasSeguridad}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          medidasSeguridad: event.target.value,
                        }))
                      }
                    />
                  </label>
                </SectionCard>

                <SectionCard
                  title="Perfilamiento"
                  description="Solo profundiza aqui si la actividad usa perfiles o analitica que impacte decisiones sobre personas."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Uso de perfiles</span>
                      <select
                        className="input"
                        value={form.usoPerfiles}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            usoPerfiles: event.target.value,
                          }))
                        }
                      >
                        {yesNoOptions.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field full-width">
                      <span>Descripcion de perfilamiento</span>
                      <textarea
                        className="input textarea"
                        rows={4}
                        disabled={form.usoPerfiles !== "SI"}
                        value={form.descripcionPerfilamiento}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            descripcionPerfilamiento: event.target.value,
                          }))
                        }
                      />
                    </label>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 8 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Activos asociados"
                  description="Relaciona los activos de informacion vinculados a la dependencia responsable y al soporte fisico o logico de la actividad."
                >
                  <div className="form-grid">
                    <div className="field">
                      <span>Activo electronico</span>
                      <SearchableSelect
                        value={form.activoElectronico}
                        options={electronicAssetOptions}
                        placeholder={
                          form.dependenciaId.length === 0
                            ? "Seleccione primero la dependencia responsable"
                            : activosQuery.isLoading
                              ? "Cargando activos vinculados..."
                              : selectedElectronicAsset
                                ? formatOrgLabel(
                                    selectedElectronicAsset.nombre,
                                    selectedElectronicAsset.codigo,
                                  )
                                : "Seleccione el activo electronico"
                        }
                        searchPlaceholder="Busque por nombre, codigo, tipo o clasificacion"
                        emptyMessage={
                          form.dependenciaId.length === 0
                            ? "Seleccione primero la dependencia responsable."
                            : form.categoriaActivo
                              ? "No hay activos de ese tipo vinculados a esta dependencia."
                              : "No hay activos vinculados a esta dependencia."
                        }
                        disabled={form.dependenciaId.length === 0 || activosQuery.isLoading}
                        onChange={(value) => {
                          const selectedAsset =
                            dependencyAssets.find((item) => String(item.id) === value) ?? null;

                          setForm((current) => ({
                            ...current,
                            activoElectronico: value,
                            categoriaActivo: selectedAsset?.tipoActivo ?? "",
                          }));
                        }}
                      />
                    </div>

                    <label className="field">
                      <span>Activo fisico</span>
                      <input
                        className="input"
                        placeholder="Ej. Solicitud para empleador"
                        value={form.activoFisico}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            activoFisico: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Tipo del activo</span>
                      <input
                        className="input readonly-field"
                        readOnly
                        value={
                          selectedElectronicAssetType ||
                          "Se completa automaticamente al seleccionar el activo electronico"
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Base de datos o repositorio</span>
                      <input
                        className="input"
                        placeholder="Ej. IESSPRD"
                        value={form.baseDatos}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, baseDatos: event.target.value }))
                        }
                      />
                    </label>
                  </div>
                </SectionCard>
              </div>
            ) : null}

            {activeStep === 9 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Lectura automatica preliminar"
                  description="El sistema resume aqui los detonantes mas visibles para que el usuario entre a MTGE o EIPD con contexto."
                >
                  <div className="risk-snapshot-grid">
                    <article className="risk-snapshot-card">
                      <span>Datos especiales</span>
                      <strong>{hasSpecialCategories ? "Si" : "No"}</strong>
                    </article>
                    <article className="risk-snapshot-card">
                      <span>Tratamiento a gran escala</span>
                      <strong>{isLargeScale ? "Si" : "No"}</strong>
                    </article>
                    <article className="risk-snapshot-card">
                      <span>Transferencia internacional</span>
                      <strong>{hasInternationalTransfer ? "Si" : "No"}</strong>
                    </article>
                    <article className="risk-snapshot-card risk-snapshot-card-emphasis">
                      <span>EIPD sugerida</span>
                      <strong>
                        {eipdRecommended
                          ? "Si, revisar inmediatamente"
                          : "No obligatoria por esta lectura inicial"}
                      </strong>
                    </article>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Observaciones para evaluacion"
                  description="Deja aqui riesgos preliminares, dudas o condiciones que deban pasar a MTGE o a una EIPD."
                >
                  <label className="field">
                    <span>Observacion de riesgo o contexto</span>
                    <textarea
                      className="input textarea"
                      rows={6}
                      placeholder="Anote riesgos preliminares, dudas regulatorias o condiciones que deban pasar a MTGE o EIPD."
                      value={form.observacionRiesgo}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          observacionRiesgo: event.target.value,
                        }))
                      }
                    />
                  </label>
                </SectionCard>
              </div>
            ) : null}
          </section>

          <div className="wizard-action-bar">
            <div className="wizard-footer-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => {
                  clearTreatmentDraft();
                  navigate("/actividades");
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                className="button-secondary"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((current) => Math.max(current - 1, 0))}
              >
                Anterior
              </button>

              <button
                type="button"
                className="button-primary"
                onClick={() =>
                  setActiveStep((current) => Math.min(current + 1, RAT_FORM_STEPS.length - 1))
                }
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SectionCard({
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return <section className="section-card">{children}</section>;
}

function ChoiceGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="choice-grid">
      {options.map((item) => {
        const isSelected = selected.includes(item);

        return (
          <label
            key={item}
            className={isSelected ? "choice-chip choice-chip-selected" : "choice-chip"}
          >
            <input type="checkbox" checked={isSelected} onChange={() => onToggle(item)} />
            <span>{item}</span>
          </label>
        );
      })}
    </div>
  );
}

function toggleValue(items: string[], value: string) {
  return items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];
}

function buildRatCode(sigla: string | null) {
  const year = new Date().getFullYear();
  const normalizedSigla = sigla?.trim().length ? sigla.trim().toUpperCase() : "PENDIENTE";

  return `RAT-${normalizedSigla}-${year}`;
}

function coerceDraftValues(
  values: Record<string, string | string[]>,
): Partial<RatDraftForm> {
  return values as Partial<RatDraftForm>;
}

function getStepProgress(
  form: RatDraftForm,
  checks: Array<(currentForm: RatDraftForm) => boolean>,
): StepProgress {
  return {
    completed: checks.filter((check) => check(form)).length,
    total: checks.length,
  };
}

function getStepStatus(index: number, activeStep: number, progress: StepProgress) {
  if (index === activeStep) {
    return "active";
  }

  if (progress.total > 0 && progress.completed === progress.total) {
    return "done";
  }

  if (progress.completed > 0) {
    return "partial";
  }

  return "pending";
}

function formatOrgLabel(nombre: string, sigla?: string | null) {
  if (!sigla?.trim()) {
    return nombre;
  }

  return `${nombre} (${sigla.trim().toUpperCase()})`;
}

function buildActiveOrganizationLookup() {
  const values = new Set<string>();

  for (const unit of getOrganizationUnits()) {
    if (unit.status !== "Activa") {
      continue;
    }

    values.add(normalizeOrgKey(unit.nombre));

    if (unit.sigla?.trim()) {
      values.add(normalizeOrgKey(unit.sigla));
    }
  }

  return values;
}

function isUnitAvailableForRegistration(
  unit: { nombre: string; sigla?: string | null; activo?: boolean | null },
  activeOrganizationLookup: Set<string>,
) {
  if (unit.activo === false) {
    return false;
  }

  if (activeOrganizationLookup.size === 0) {
    return true;
  }

  return (
    activeOrganizationLookup.has(normalizeOrgKey(unit.nombre)) ||
    Boolean(unit.sigla?.trim() && activeOrganizationLookup.has(normalizeOrgKey(unit.sigla)))
  );
}

function normalizeOrgKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getProgressTone(progress: number) {
  if (progress >= 100) {
    return "#215732";
  }

  if (progress >= 75) {
    return "#4f7a2a";
  }

  if (progress >= 50) {
    return "#a56b1f";
  }

  if (progress >= 25) {
    return "#bf4f22";
  }

  return "#8f2f2f";
}

function getDraftLifecycleStatus(progress: number): RecordStatus {
  return progress >= 100 ? "En revision" : "Borrador";
}

function getSaveDraftLabel(
  mode: "create" | TreatmentDraftMode,
  nextStatus: RecordStatus,
) {
  const isEdit = mode === "edit";

  if (nextStatus === "En revision") {
    return isEdit ? "Actualizar y enviar a revision" : "Guardar y enviar a revision";
  }

  return isEdit ? "Actualizar borrador" : "Guardar borrador";
}

function normalizeStatusToken(value: RecordStatus) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function buildRatRecordFromForm({
  form,
  mode,
  progress,
  generatedCode,
  selectedDependencia,
  selectedSubdireccion,
  selectedElectronicAsset,
  eipdRecommended,
  sourceRat,
  sourceActivity,
  actorName,
  registryRecords,
}: {
  form: RatDraftForm;
  mode: "create" | TreatmentDraftMode;
  progress: number;
  generatedCode: string;
  selectedDependencia: Dependencia | null;
  selectedSubdireccion: Subdireccion | null;
  selectedElectronicAsset: ActivoSummary | null;
  eipdRecommended: boolean;
  sourceRat: RatRegistryRecord | null;
  sourceActivity: ActivityRegistryRecord | null;
  actorName: string;
  registryRecords: RatRegistryRecord[];
}): RatRegistryRecord {
  const today = new Date().toISOString().slice(0, 10);
  const nextStatus = getDraftLifecycleStatus(progress);
  const dependencyName = selectedDependencia?.nombre ?? "Dependencia pendiente";
  const dependencySigla = selectedDependencia?.sigla?.trim().toUpperCase() ?? "PENDIENTE";
  const ratId = mode === "edit" && sourceRat ? sourceRat.id : Date.now();
  const activityId = mode === "edit" && sourceActivity ? sourceActivity.id : ratId + 1;
  const activityCode =
    mode === "edit" && sourceActivity
      ? sourceActivity.codigo
      : buildActivityCode(dependencySigla, registryRecords);
  const ratCode =
    selectedDependencia?.sigla?.trim() || mode !== "edit" ? generatedCode : sourceRat?.codigo ?? generatedCode;
  const ratName = form.nombreTratamiento.trim() || sourceRat?.nombre || "Tratamiento sin nombre";
  const executiveSummary = form.descripcion.trim() || form.finalidad.trim() || ratName;
  const riskLevel = deriveRiskLevel(form, eipdRecommended);
  const externalTransfer =
    form.accesoTransferencia === "SI" && form.paisTercero && form.paisTercero !== "Ecuador";
  const activityVersion =
    mode === "edit" && sourceActivity ? sourceActivity.version : "1.0";
  const activityReport = {
    codigoRat: ratCode,
    nombreTratamiento: form.nombreTratamiento.trim() || ratName,
    dependenciaResponsable: dependencyName,
    procesoRelacionado: selectedDependencia?.tipoProceso?.nombre ?? "Pendiente",
    subproceso: selectedSubdireccion?.nombre ?? "Pendiente",
    estado: nextStatus,
    nivelRiesgo: riskLevel,
    requiereEipd: eipdRecommended,
    fechaCreacion: form.fechaLevantamiento || today,
    ultimaActualizacion: today,
    finalidadEspecifica: form.finalidad.trim() || "Pendiente de documentar.",
    baseLicitud: form.baseLegal || "Pendiente de documentar",
    normaAplicable: form.descripcionBaseLegal.trim() || "Pendiente de documentar",
    titulares: formatListValue(form.titulares),
    categoriasDatos: formatListValue(form.categoriasDatos),
    datosSensibles: form.descripcionDatos.trim() || "Pendiente de documentar",
    datosNna: "Pendiente de documentar",
    origenDatos: form.procedenciaDatos || "Pendiente de documentar",
    mediosRecoleccion: "Pendiente de documentar",
    accionesTratamiento: formatListValue(form.accionesTratamiento),
    plazoConservacion: form.plazoRetencion.trim() || "Pendiente de documentar",
    criteriosConservacion:
      form.permanenciaTratamiento || "Pendiente de documentar",
    supresionAnonimizacion:
      form.permanenciaTratamiento || "Pendiente de documentar",
    destinatariosInternos: "Pendiente de documentar",
    destinatariosExternos:
      form.accesoTransferencia === "SI"
        ? formatListValue([form.nombreTercero, form.categoriaTercero])
        : "No aplica",
    transferenciasInternacionales: externalTransfer ? "Si" : "No",
    paisDestino: externalTransfer ? form.paisTercero : "N/A",
    mecanismoTransferencia:
      externalTransfer && form.baseLegalTransferencia.trim().length > 0
        ? form.baseLegalTransferencia.trim()
        : "N/A",
    medidasSeguridad: form.medidasSeguridad.trim() || "Pendiente de documentar",
  } satisfies ActivityRegistryRecord["report"];

  const activity: ActivityRegistryRecord = {
    id: activityId,
    ratId,
    codigo: activityCode,
    nombre: form.nombreTratamiento.trim() || "Tratamiento sin nombre",
    ratCodigo: ratCode,
    ratNombre: ratName,
    dependencia: dependencyName,
    unidadEjecutora: selectedSubdireccion?.nombre ?? "Pendiente",
    estado: nextStatus,
    riesgo: riskLevel,
    requiereEipd: eipdRecommended,
    version: activityVersion,
    fechaActualizacion: today,
    responsables: [dependencySigla, selectedSubdireccion?.nombre ?? "Pendiente"],
    observaciones: buildObservations(form, selectedElectronicAsset),
    pendientes: buildPendingItems(form, nextStatus, eipdRecommended),
    report: activityReport,
  };

  return {
    id: ratId,
    codigo: ratCode,
    nombre: ratName,
    dependencia: dependencyName,
    unidadResponsable: dependencySigla,
    estado: nextStatus,
    riesgo: riskLevel,
    requiereEipd: eipdRecommended,
    totalActividades: 1,
    fechaActualizacion: today,
    responsableLevantamiento: actorName,
    responsableTratamiento: dependencyName,
    resumen: executiveSummary,
    activities: [activity],
  };
}

function buildActivityCode(sigla: string, registryRecords: RatRegistryRecord[]) {
  const normalizedSigla = sigla.trim().toUpperCase() || "PENDIENTE";
  const prefix = `ACT-${normalizedSigla}-`;
  const usedCodes = registryRecords.flatMap((rat) => rat.activities.map((activity) => activity.codigo));
  const nextIndex =
    usedCodes.filter((code) => code.startsWith(prefix)).length + 1;

  return `${prefix}${String(nextIndex).padStart(3, "0")}`;
}

function deriveRiskLevel(form: RatDraftForm, eipdRecommended: boolean): RiskLevel {
  if (eipdRecommended) {
    return "Alto";
  }

  if (form.observacionRiesgo.trim().length > 0 || form.accesoTransferencia === "SI") {
    return "Medio";
  }

  return "Bajo";
}

function formatListValue(values: string[]) {
  return values.filter(Boolean).join(", ") || "Pendiente de documentar";
}

function buildObservations(form: RatDraftForm, selectedElectronicAsset: ActivoSummary | null) {
  const notes: string[] = [];

  if (selectedElectronicAsset?.impacto) {
    notes.push(`Activo vinculado con impacto ${selectedElectronicAsset.impacto}.`);
  }

  if (form.baseDatos.trim()) {
    notes.push(`Repositorio asociado: ${form.baseDatos.trim()}.`);
  }

  if (form.observacionRiesgo.trim()) {
    notes.push(form.observacionRiesgo.trim());
  }

  return notes.length > 0 ? notes : ["Sin observaciones registradas en esta version."];
}

function buildPendingItems(
  form: RatDraftForm,
  nextStatus: RecordStatus,
  eipdRecommended: boolean,
) {
  const pending: string[] = [];

  if (nextStatus === "Borrador") {
    pending.push("Completar los campos obligatorios pendientes antes de enviar a revision.");
  }

  if (eipdRecommended) {
    pending.push("Revisar MTGE y EIPD antes de publicar el tratamiento.");
  }

  if (!form.baseDatos.trim()) {
    pending.push("Confirmar el repositorio o base de datos principal del tratamiento.");
  }

  return pending.length > 0 ? pending : ["Sin pendientes registrados."];
}
