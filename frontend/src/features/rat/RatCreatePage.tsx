import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { apiClient } from "../../services/api-client";
import {
  SearchableSelect,
  type SearchableSelectOption,
} from "./SearchableSelect";
import {
  ACTION_OPTIONS,
  ASSET_CATEGORY_OPTIONS,
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
};

type SubdireccionesResponse = {
  data: Subdireccion[];
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

type StepMeta = {
  eyebrow: string;
  summary: string;
  footer: string;
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

const STEP_META: StepMeta[] = [
  {
    eyebrow: "Base del registro",
    summary:
      "Aterriza la actividad: nombre, unidad responsable, unidad ejecutora y una descripcion clara.",
    footer:
      "Cuando esta base queda bien definida, el resto del formulario se vuelve mucho mas rapido.",
  },
  {
    eyebrow: "Sustento del tratamiento",
    summary:
      "Explica por que existe la actividad y cual es la base juridica que la habilita.",
    footer:
      "Describe la finalidad con lenguaje operativo y deja la base legal lista para auditoria.",
  },
  {
    eyebrow: "Sujetos involucrados",
    summary:
      "Selecciona solo los tipos de titulares realmente impactados por esta actividad.",
    footer:
      "No necesitas justificar cada seleccion aqui; la prioridad es reflejar el alcance real.",
  },
  {
    eyebrow: "Universo de datos",
    summary:
      "Marca las categorias de datos y luego resume los principales campos personales tratados.",
    footer:
      "Este paso alimenta la lectura de riesgo y la necesidad posterior de EIPD.",
  },
  {
    eyebrow: "Operacion y escala",
    summary:
      "Define el origen de los datos, las acciones que se aplican y la escala del tratamiento.",
    footer:
      "Piensa este paso como la fotografia operativa de la actividad en la practica.",
  },
  {
    eyebrow: "Terceros y flujos",
    summary:
      "Solo completa este paso en detalle cuando existan accesos, encargos o transferencias.",
    footer:
      "Si no hay terceros ni transferencias, puedes dejarlo en su minima expresion y continuar.",
  },
  {
    eyebrow: "Ciclo de vida",
    summary:
      "Deja claro cuanto tiempo se conserva la informacion y cuales son sus fechas de control.",
    footer:
      "El plazo de retencion es clave para trazabilidad, bajas y revisiones posteriores.",
  },
  {
    eyebrow: "Controles aplicados",
    summary:
      "Resume las medidas de seguridad que ya existen y el posible uso de perfilamiento.",
    footer:
      "Describe controles reales, no solo deseados; eso mejora la calidad del analisis de riesgo.",
  },
  {
    eyebrow: "Soporte de informacion",
    summary:
      "Relaciona los activos, repositorios o medios que soportan la actividad de tratamiento.",
    footer:
      "Este puente sera util despues para enlazar la actividad con activos gestionados formalmente.",
  },
  {
    eyebrow: "Lectura preliminar",
    summary:
      "Cierra con una vista sintetica del riesgo y con observaciones para MTGE o EIPD.",
    footer:
      "Aqui no cierras el analisis; solo dejas listo el contexto para la siguiente evaluacion.",
  },
];

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
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<RatDraftForm>(INITIAL_FORM);

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

  const dependencias = dependenciasQuery.data ?? [];
  const subdirecciones = subdireccionesQuery.data ?? [];
  const selectedDependencia =
    dependencias.find((item) => String(item.id) === form.dependenciaId) ?? null;
  const selectedSubdireccion =
    subdirecciones.find((item) => String(item.id) === form.subdireccionId) ?? null;
  const dependenciaOptions = dependencias.map<SearchableSelectOption>((item) => ({
    value: String(item.id),
    label: item.nombre,
    tag: item.sigla,
    meta: item.tipoProceso?.nombre ?? "Unidad sin bloque organico",
    searchText: item.tipoProceso?.nombre ?? "",
  }));
  const subdireccionOptions = subdirecciones.map<SearchableSelectOption>((item) => ({
    value: String(item.id),
    label: item.nombre,
    tag: item.sigla,
    meta: selectedDependencia?.nombre ?? "Unidad ejecutora",
  }));

  const generatedCode = buildRatCode(selectedDependencia?.sigla ?? null);
  const currentStep = RAT_FORM_STEPS[activeStep];
  const currentStepMeta = STEP_META[activeStep];
  const stepProgress = STEP_REQUIREMENTS.map((checks) => getStepProgress(form, checks));
  const completedRequired = stepProgress.reduce((sum, item) => sum + item.completed, 0);
  const totalRequired = stepProgress.reduce((sum, item) => sum + item.total, 0);
  const progress = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
  const currentStepProgress = stepProgress[activeStep];

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

  const summaryItems = [
    { label: "Codigo", value: generatedCode },
    {
      label: "Responsable",
      value: selectedDependencia
        ? formatOrgLabel(selectedDependencia.nombre, selectedDependencia.sigla)
        : "Sin definir",
    },
    {
      label: "Ejecutora",
      value: selectedSubdireccion
        ? formatOrgLabel(selectedSubdireccion.nombre, selectedSubdireccion.sigla)
        : "Sin definir",
    },
    {
      label: "Proceso",
      value: selectedDependencia?.tipoProceso?.nombre ?? "Pendiente",
    },
  ];

  return (
    <section className="wizard-experience">
      <header className="page-header page-header-inline wizard-page-header">
        <div>
          <span className="brand-kicker">Registro de actividad de tratamiento</span>
          <h2>Crear una actividad sin friccion innecesaria</h2>
          <p className="page-copy">
            El formulario ahora avanza por etapas cortas, mantiene el progreso visible
            y concentra al usuario solo en lo que necesita resolver en el paso actual.
          </p>
        </div>

        <div className="wizard-toolbar">
          <span className="status-pill">BORRADOR</span>
          <button type="button" className="button-secondary">
            Guardar borrador
          </button>
        </div>
      </header>

      <section className="panel wizard-overview">
        <div className="wizard-overview-top">
          <div>
            <span className="brand-kicker">Progreso del registro</span>
            <h3>{progress}% completado</h3>
            <p className="page-copy">
              {completedRequired} de {totalRequired} campos obligatorios listos.
              Avanza por bloques, no por una hoja infinita.
            </p>
          </div>

          <div className="wizard-overview-badges">
            <article className="overview-badge">
              <strong>
                Paso {activeStep + 1} / {RAT_FORM_STEPS.length}
              </strong>
              <span>{currentStep.title}</span>
            </article>
            <article className="overview-badge">
              <strong>
                {currentStepProgress.total > 0
                  ? `${currentStepProgress.completed}/${currentStepProgress.total}`
                  : "Complementario"}
              </strong>
              <span>
                {currentStepProgress.total > 0
                  ? "obligatorios de este paso"
                  : "sin campos obligatorios"}
              </span>
            </article>
          </div>
        </div>

        <div className="progress-bar wizard-progress-bar">
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
            <strong>Navega sin perder el hilo</strong>
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
                  <small>{item.caption}</small>
                </span>
                <span className="wizard-step-meter">
                  {itemProgress.total > 0
                    ? `${itemProgress.completed}/${itemProgress.total}`
                    : "Libre"}
                </span>
              </button>
            );
          })}
        </aside>

        <div className="wizard-main">
          <section className="panel wizard-stage">
            <div className="wizard-stage-header">
              <div>
                <span className="brand-kicker">{currentStepMeta.eyebrow}</span>
                <h3>{currentStep.title}</h3>
                <p className="page-copy">{currentStepMeta.summary}</p>
              </div>

              <div className="wizard-stage-badges">
                <span className="pill">
                  Paso {activeStep + 1} de {RAT_FORM_STEPS.length}
                </span>
                <span className="pill pill-muted">
                  {currentStepProgress.total > 0
                    ? `${currentStepProgress.completed}/${currentStepProgress.total} obligatorios`
                    : "Paso complementario"}
                </span>
              </div>
            </div>

            {dependenciasQuery.isError ? (
              <div className="error-box">
                No fue posible cargar la estructura organica. Revise el backend
                antes de registrar una nueva actividad.
              </div>
            ) : null}

            {activeStep === 0 ? (
              <div className="wizard-section-stack">
                <SectionCard
                  title="Control del registro"
                  description="Los datos generados automaticamente quedan visibles desde el inicio."
                >
                  <div className="form-grid form-grid-3">
                    <label className="field">
                      <span>Codigo RAT</span>
                      <input className="input readonly-field" readOnly value={generatedCode} />
                    </label>

                    <label className="field">
                      <span>Fecha de creacion</span>
                      <input className="input readonly-field" readOnly value={TODAY} />
                    </label>

                    <label className="field">
                      <span>Estado inicial</span>
                      <input className="input readonly-field" readOnly value="BORRADOR" />
                    </label>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Contexto organizacional"
                  description="Selecciona primero la unidad responsable para activar la unidad ejecutora correspondiente."
                >
                  <div className="form-grid form-grid-3">
                    <div className="field">
                      <span>Unidad responsable</span>
                      <SearchableSelect
                        value={form.dependenciaId}
                        options={dependenciaOptions}
                        placeholder={
                          dependenciasQuery.isLoading
                            ? "Cargando unidades..."
                            : "Seleccione la unidad responsable"
                        }
                        searchPlaceholder="Busque por nombre o sigla"
                        emptyMessage="No hay unidades que coincidan con la busqueda."
                        disabled={dependenciasQuery.isLoading}
                        onChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            dependenciaId: value,
                            subdireccionId: "",
                          }))
                        }
                      />
                    </div>

                    <label className="field">
                      <span>Tipo de proceso</span>
                      <input
                        className="input readonly-field"
                        readOnly
                        value={
                          selectedDependencia?.tipoProceso?.nombre ??
                          "Seleccione primero la unidad responsable"
                        }
                      />
                    </label>

                    <div className="field">
                      <span>Unidad ejecutora</span>
                      <SearchableSelect
                        value={form.subdireccionId}
                        options={subdireccionOptions}
                        placeholder={
                          form.dependenciaId.length === 0
                            ? "Seleccione antes la unidad responsable"
                            : subdireccionesQuery.isLoading
                              ? "Cargando unidades ejecutoras..."
                              : "Seleccione la unidad ejecutora"
                        }
                        searchPlaceholder="Busque por nombre o sigla"
                        emptyMessage="No hay unidades ejecutoras registradas para esta dependencia."
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
                  title="Base legitimadora"
                  description="Selecciona la base principal y agrega el respaldo normativo o institucional."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Base legitimadora</span>
                      <select
                        className="input"
                        value={form.baseLegal}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, baseLegal: event.target.value }))
                        }
                      >
                        <option value="">Seleccione la base legal</option>
                        {BASE_LEGAL_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field full-width">
                      <span>Descripcion de base legitimadora</span>
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
                    options={TITULARES_OPTIONS}
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
                    options={DATA_CATEGORY_OPTIONS}
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
                        {DATA_ORIGIN_OPTIONS.map((item) => (
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
                        {VOLUME_OPTIONS.map((item) => (
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
                        {FREQUENCY_OPTIONS.map((item) => (
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
                        {RETENTION_PATTERN_OPTIONS.map((item) => (
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
                        {SCOPE_OPTIONS.map((item) => (
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
                    options={ACTION_OPTIONS}
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
                        {YES_NO_OPTIONS.map((item) => (
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
                        {THIRD_PARTY_CATEGORY_OPTIONS.map((item) => (
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
                        {COUNTRY_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="field full-width">
                      <span>Base legitimadora para transferencia exterior</span>
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
                        {YES_NO_OPTIONS.map((item) => (
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
                  description="Relaciona el soporte electronico, fisico y logico que permite operar esta actividad."
                >
                  <div className="form-grid">
                    <label className="field">
                      <span>Activo electronico</span>
                      <input
                        className="input"
                        placeholder="Ej. Historia laboral empleadores"
                        value={form.activoElectronico}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            activoElectronico: event.target.value,
                          }))
                        }
                      />
                    </label>

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
                      <span>Clasificacion del activo</span>
                      <select
                        className="input"
                        value={form.categoriaActivo}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            categoriaActivo: event.target.value,
                          }))
                        }
                      >
                        <option value="">Seleccione la categoria del activo</option>
                        {ASSET_CATEGORY_OPTIONS.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
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
            <div className="wizard-action-context">
              <strong>{currentStep.title}</strong>
              <span>{currentStepMeta.footer}</span>
            </div>

            <div className="wizard-footer-actions">
              <button type="button" className="button-secondary">
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
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="section-card">
      <div className="section-card-header">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      {children}
    </section>
  );
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
  const normalizedSigla = sigla?.trim().length ? sigla.trim().toUpperCase() : "UNIDAD";

  return `RAT-IESS-${normalizedSigla}-${year}`;
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
