import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
  const progress = Math.round((countCompletedRequiredFields(form) / 12) * 100);

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

  return (
    <section>
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">RAT &gt; Nuevo registro</span>
          <h2>Crear nuevo RAT y actividad inicial</h2>
          <p className="page-copy">
            El registro se construye por secciones. Los campos maestros usan
            estructura organica y listas controladas para evitar basura en la
            base de datos.
          </p>
        </div>

        <div className="wizard-actions-top">
          <button type="button" className="button-secondary">
            Guardar borrador
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
      </header>

      <div className="wizard-layout">
        <aside className="panel wizard-stepper">
          {RAT_FORM_STEPS.map((item, index) => (
            <button
              key={item.title}
              type="button"
              className={index === activeStep ? "wizard-step wizard-step-active" : "wizard-step"}
              onClick={() => setActiveStep(index)}
            >
              <span className="wizard-step-index">{index + 1}</span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.caption}</small>
              </span>
            </button>
          ))}
        </aside>

        <div className="wizard-main">
          <section className="panel wizard-panel">
            <div className="panel-heading">
              <div>
                <span className="brand-kicker">
                  Paso {activeStep + 1} de {RAT_FORM_STEPS.length}
                </span>
                <h3>{currentStep.title}</h3>
                <p className="page-copy">{currentStep.caption}</p>
              </div>
            </div>

            {dependenciasQuery.isError ? (
              <div className="error-box">
                No fue posible cargar la estructura organica. Revise el backend
                antes de registrar un nuevo RAT.
              </div>
            ) : null}

            {activeStep === 0 ? (
              <div className="form-grid">
                <label className="field">
                  <span>Codigo RAT</span>
                  <input className="input readonly-field" readOnly value={generatedCode} />
                </label>

                <label className="field">
                  <span>Fecha de creacion</span>
                  <input className="input readonly-field" readOnly value={TODAY} />
                </label>

                <label className="field">
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

                <label className="field">
                  <span>Tipo de proceso</span>
                  <input
                    className="input readonly-field"
                    readOnly
                    value={selectedDependencia?.tipoProceso?.nombre ?? "Seleccione primero la unidad responsable"}
                  />
                </label>

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
                  <small className="field-help">
                    Solo se admiten unidades existentes en la estructura organica.
                  </small>
                </div>

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
                    disabled={form.dependenciaId.length === 0 || subdireccionesQuery.isLoading}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        subdireccionId: value,
                      }))
                    }
                  />
                  <small className="field-help">
                    Puede filtrar por palabra clave o abreviatura para ubicar mas rapido una unidad.
                  </small>
                </div>

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

                <div className="inline-status full-width">
                  <span className="status-pill">BORRADOR</span>
                  <small>
                    Solo la estructura organica existente puede alimentar la unidad responsable.
                  </small>
                </div>
              </div>
            ) : null}

            {activeStep === 1 ? (
              <div className="form-grid">
                <label className="field full-width">
                  <span>Finalidad del tratamiento</span>
                  <textarea
                    className="input textarea"
                    rows={4}
                    placeholder="Explique la finalidad especifica del tratamiento de datos personales."
                    value={form.finalidad}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, finalidad: event.target.value }))
                    }
                  />
                </label>

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
                    rows={8}
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
            ) : null}

            {activeStep === 2 ? (
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
            ) : null}

            {activeStep === 3 ? (
              <div className="form-grid">
                <div className="full-width">
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
                </div>

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
              </div>
            ) : null}

            {activeStep === 4 ? (
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

                <div className="full-width">
                  <span className="field-label">Acciones sobre datos personales</span>
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
                </div>

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
            ) : null}

            {activeStep === 5 ? (
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
                      setForm((current) => ({ ...current, nombreTercero: event.target.value }))
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
                      setForm((current) => ({ ...current, contactoTercero: event.target.value }))
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
                      setForm((current) => ({ ...current, paisTercero: event.target.value }))
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
            ) : null}

            {activeStep === 6 ? (
              <div className="form-grid">
                <label className="field">
                  <span>Plazo de retencion</span>
                  <input
                    className="input"
                    placeholder="Ej. Hasta cumplir con la finalidad del tratamiento"
                    value={form.plazoRetencion}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, plazoRetencion: event.target.value }))
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
            ) : null}

            {activeStep === 7 ? (
              <div className="form-grid">
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
            ) : null}

            {activeStep === 8 ? (
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
            ) : null}

            {activeStep === 9 ? (
              <div className="detail-stack">
                <div className="detail-block">
                  <h4>Lectura automatica preliminar</h4>
                  <dl className="detail-grid">
                    <div>
                      <dt>Datos especiales</dt>
                      <dd>{hasSpecialCategories ? "Si" : "No"}</dd>
                    </div>
                    <div>
                      <dt>Tratamiento a gran escala</dt>
                      <dd>{isLargeScale ? "Si" : "No"}</dd>
                    </div>
                    <div>
                      <dt>Transferencia internacional</dt>
                      <dd>{hasInternationalTransfer ? "Si" : "No"}</dd>
                    </div>
                    <div>
                      <dt>EIPD sugerida</dt>
                      <dd>
                        {eipdRecommended
                          ? "Si, revisar inmediatamente"
                          : "No obligatoria por esta lectura inicial"}
                      </dd>
                    </div>
                  </dl>
                </div>

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
              </div>
            ) : null}
          </section>

          <div className="wizard-footer">
            <button type="button" className="button-secondary">
              Cancelar
            </button>

            <div className="wizard-footer-actions">
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

        <aside className="wizard-side">
          <article className="panel helper-card">
            <h4>Informacion de ayuda</h4>
            <p>{currentStep.help}</p>
          </article>

          <article className="panel helper-card">
            <h4>Calidad de dato</h4>
            <p>
              La unidad responsable no admite texto libre. Se alimenta solo con
              la estructura organica registrada en el sistema.
            </p>
          </article>

          <article className="panel helper-card">
            <h4>Progreso del registro</h4>
            <p>
              Paso {activeStep + 1} de {RAT_FORM_STEPS.length}
            </p>
            <div className="progress-bar">
              <span style={{ width: `${progress}%` }} />
            </div>
            <strong>{progress}%</strong>
          </article>

          <article className="panel helper-card">
            <h4>Campos clave del Excel</h4>
            <ul className="helper-list">
              <li>Responsable y unidad organizacional</li>
              <li>Finalidad y base legitimadora</li>
              <li>Titulares y categorias de datos</li>
              <li>Operaciones, activos, terceros y conservacion</li>
            </ul>
          </article>
        </aside>
      </div>
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
          <label key={item} className={isSelected ? "choice-chip choice-chip-selected" : "choice-chip"}>
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

function countCompletedRequiredFields(form: RatDraftForm) {
  const checks = [
    form.nombreTratamiento.trim().length > 0,
    form.dependenciaId.length > 0,
    form.descripcion.trim().length > 0,
    form.finalidad.trim().length > 0,
    form.baseLegal.length > 0,
    form.titulares.length > 0,
    form.categoriasDatos.length > 0,
    form.procedenciaDatos.length > 0,
    form.accionesTratamiento.length > 0,
    form.volumenTitulares.length > 0,
    form.plazoRetencion.trim().length > 0,
    form.medidasSeguridad.trim().length > 0,
  ];

  return checks.filter(Boolean).length;
}
