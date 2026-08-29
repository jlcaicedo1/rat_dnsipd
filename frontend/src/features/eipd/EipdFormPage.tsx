import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ConfirmWithMotivoModal } from "../../components/ConfirmWithMotivoModal";
import iessLogoColor from "../../assets/iess-logo-color.png";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import {
  PANEL_TITLES, PANELS, RISK_COLORS, S2_SCENARIOS, S3_SCENARIOS,
  type PanelId, type Scenario,
} from "./eipd-form-data";
import { useEipdFormCreate, useEipdFormOne, useEipdFormSave, type EipdFormPatch } from "./eipd-form.api";
import { buildInstitutionalReport, printInstitutionalReport, rptTable, rptNote } from "../../utils/buildInstitutionalReport";
import "./eipd-form.css";

type EipdPendingAction = {
  estado: string;
  titulo: string;
  actionLabel: string;
  variant: "primary" | "warning" | "danger";
  payload?: EipdFormPatch;
};

type FormState = Record<string, string>;
type TratRow = { medida: string; tipo: string; responsable: string; plazo: string; estado: string; evidencia: string };
type DatosRow = { categoria: string; tipo: string; descripcion: string; licitud: string; plazo: string; destinatarios: string };
type ActivoRow = { nombre: string; tipo: string; propietario: string; ubicacion: string; controles: string; observaciones: string };

const TRAT_ROW = (): TratRow => ({ medida: "", tipo: "Jurídico", responsable: "", plazo: "", estado: "Pendiente", evidencia: "" });
const DATOS_ROW = (): DatosRow => ({ categoria: "Datos simples", tipo: "", descripcion: "", licitud: "Consentimiento", plazo: "", destinatarios: "" });
const ACTIVO_ROW = (): ActivoRow => ({ nombre: "", tipo: "Base de datos / repositorio", propietario: "", ubicacion: "", controles: "", observaciones: "" });

function riskStyle(value: string): React.CSSProperties {
  const color = RISK_COLORS[value.toLowerCase()] ?? "";
  return color ? { color, fontWeight: 700 } : {};
}

type ScenarioState = { open: boolean; fields: FormState; tratRows: TratRow[] };
function makeScenarioState(): ScenarioState {
  return { open: false, fields: {}, tratRows: [TRAT_ROW(), TRAT_ROW()] };
}

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_ELABORACION: "En elaboracion",
  EN_REVISION: "En revision DPD",
  DEVUELTO: "Devuelto por DPD",
  APROBADO: "Aprobado",
  CERRADO: "Cerrado",
};

const ESTADO_TOKEN: Record<string, string> = {
  BORRADOR: "borrador",
  EN_ELABORACION: "borrador",
  EN_REVISION: "en-revision",
  DEVUELTO: "borrador",
  APROBADO: "vigente",
  CERRADO: "archivado",
};

const PANEL_HELP: Record<PanelId, string> = {
  portada: "Identificacion del documento, version y control de cambios.",
  s1: "Descripcion del tratamiento, categorias de datos y activos involucrados.",
  s2: "Escenarios de riesgo juridico sobre derechos y libertades de los titulares.",
  s3: "Escenarios de riesgo de seguridad por confidencialidad, integridad y disponibilidad.",
  s4: "Registro consolidado de todos los riesgos identificados con probabilidad e impacto.",
  s5: "Medidas de tratamiento, controles, responsables y seguimiento por riesgo.",
  s6: "Indice de anexos, evidencias y documentos de soporte.",
  s7: "Conclusion, decision y firmas de aprobacion del formulario.",
};

export function EipdFormPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const actividadVersionId = searchParams.get("actividadVersionId")
    ? Number(searchParams.get("actividadVersionId"))
    : undefined;
  // Context inherited from RAT form when navigating via "Iniciar EIPD"
  const ratActividadParam = searchParams.get("actividad") ?? undefined;
  const ratNombreParam = searchParams.get("nombre") ?? undefined;
  const ratDependenciaParam = searchParams.get("dependencia") ?? undefined;
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cap = getRoleCapabilities(user?.role).eipdForm;
  const isNew = idParam === 'new';
  const docId = isNew ? 0 : Number(idParam);
  const [currentPanel, setCurrentPanel] = useState<PanelId>("portada");
  const [trackingCode, setTrackingCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({});
  const [s2State, setS2State] = useState<ScenarioState[]>(() => S2_SCENARIOS.map(makeScenarioState));
  const [s3State, setS3State] = useState<ScenarioState[]>(() => S3_SCENARIOS.map(makeScenarioState));
  const [s3Cat, setS3Cat] = useState<string>("all");
  const [datosRows, setDatosRows] = useState<DatosRow[]>([DATOS_ROW(), DATOS_ROW()]);
  const [activosRows, setActivosRows] = useState<ActivoRow[]>([ACTIVO_ROW(), ACTIVO_ROW()]);
  const [s4Rows, setS4Rows] = useState<Array<Record<string, string>>>([{}]);
  const [s5Rows, setS5Rows] = useState<Array<Record<string, string>>>([{}]);
  const [s6Rows, setS6Rows] = useState<Array<Record<string, string>>>([{}]);
  const [pendingAction, setPendingAction] = useState<EipdPendingAction | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docIdRef = useRef<number | null>(null);

  const { data: doc } = useEipdFormOne(docId);
  const saveMutation = useEipdFormSave();
  const createMutation = useEipdFormCreate();

  // Pre-populate new form with RAT activity context passed via query params
  useEffect(() => {
    if (!isNew) return;
    const initial: FormState = {};
    if (ratActividadParam) initial["portada-actividad"] = ratActividadParam;
    if (ratNombreParam) initial["s1-descripcion"] = ratNombreParam;
    if (ratDependenciaParam) initial["portada-dependencia"] = ratDependenciaParam;
    if (Object.keys(initial).length) setForm(initial);
  // Only run once on mount for new forms
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!doc || docIdRef.current === doc.id) return;
    docIdRef.current = doc.id;
    if (doc.formFields) setForm(doc.formFields);
    if (Array.isArray(doc.s2State) && doc.s2State.length) setS2State(doc.s2State as ScenarioState[]);
    if (Array.isArray(doc.s3State) && doc.s3State.length) setS3State(doc.s3State as ScenarioState[]);
    if (Array.isArray(doc.datosRows) && doc.datosRows.length) setDatosRows(doc.datosRows as DatosRow[]);
    if (Array.isArray(doc.activosRows) && doc.activosRows.length) setActivosRows(doc.activosRows as ActivoRow[]);
    if (Array.isArray(doc.s4Rows) && doc.s4Rows.length) setS4Rows(doc.s4Rows as Array<Record<string, string>>);
    if (Array.isArray(doc.s5Rows) && doc.s5Rows.length) setS5Rows(doc.s5Rows as Array<Record<string, string>>);
    if (Array.isArray(doc.s6Rows) && doc.s6Rows.length) setS6Rows(doc.s6Rows as Array<Record<string, string>>);
    if (doc.codigo) setTrackingCode(doc.codigo);
  }, [doc]);

  const buildPayload = useCallback((): EipdFormPatch => ({
    formFields: form, s2State, s3State, datosRows, activosRows, s4Rows, s5Rows, s6Rows,
  }), [form, s2State, s3State, datosRows, activosRows, s4Rows, s5Rows, s6Rows]);

  const triggerSave = useCallback(() => {
    if (!docIdRef.current) return;
    setSaving(true);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const id = docIdRef.current;
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ id, payload: buildPayload() });
      setSaving(false);
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildPayload]);

  useEffect(() => { triggerSave(); }, [triggerSave]);

  async function handleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    if (isNew || !docIdRef.current) {
      const created = await createMutation.mutateAsync({ actividadVersionId });
      docIdRef.current = created.id;
      await saveMutation.mutateAsync({ id: created.id, payload: { ...buildPayload(), estado: "EN_ELABORACION" } });
      setSaving(false);
      navigate(`/eipd/evaluacion/${created.id}`, { replace: true });
      return;
    }
    const payload: EipdFormPatch = { ...buildPayload() };
    if (doc && (doc.estado === "BORRADOR" || !doc.estado)) payload.estado = "EN_ELABORACION";
    await saveMutation.mutateAsync({ id: docIdRef.current, payload });
    setSaving(false);
  }

  async function handleEnviarRevision() {
    setPendingAction({
      estado: "EN_REVISION",
      titulo: "Enviar EIPD a revision",
      actionLabel: "Confirmar envio",
      variant: "primary",
      payload: buildPayload(),
    });
  }

  async function executeEstadoAction(action: EipdPendingAction, motivo: string) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    const extra = { motivo } as unknown as EipdFormPatch;
    if (isNew || !docIdRef.current) {
      const created = await createMutation.mutateAsync({ actividadVersionId });
      docIdRef.current = created.id;
      await saveMutation.mutateAsync({ id: created.id, payload: { ...(action.payload ?? {}), estado: action.estado, ...extra } });
      setSaving(false);
      setPendingAction(null);
      navigate(`/eipd/evaluacion/${created.id}`, { replace: true });
      return;
    }
    await saveMutation.mutateAsync({ id: docIdRef.current, payload: { ...(action.payload ?? {}), estado: action.estado, ...extra } });
    setSaving(false);
    setPendingAction(null);
  }

  function setField(key: string, value: string) { setForm((f) => ({ ...f, [key]: value })); }
  function setTrkCode(val: string) { setTrackingCode(val); }
  function toggleS2(idx: number) { setS2State((prev) => prev.map((s, i) => i === idx ? { ...s, open: !s.open } : s)); }
  function toggleS3(idx: number) { setS3State((prev) => prev.map((s, i) => i === idx ? { ...s, open: !s.open } : s)); }
  function setS2Field(sIdx: number, key: string, val: string) { setS2State((prev) => prev.map((s, i) => i === sIdx ? { ...s, fields: { ...s.fields, [key]: val } } : s)); }
  function setS3Field(sIdx: number, key: string, val: string) { setS3State((prev) => prev.map((s, i) => i === sIdx ? { ...s, fields: { ...s.fields, [key]: val } } : s)); }
  function addS2TratRow(sIdx: number) { setS2State((prev) => prev.map((s, i) => i === sIdx ? { ...s, tratRows: [...s.tratRows, TRAT_ROW()] } : s)); }
  function removeS2TratRow(sIdx: number, rIdx: number) { setS2State((prev) => prev.map((s, i) => i === sIdx ? { ...s, tratRows: s.tratRows.filter((_, j) => j !== rIdx) } : s)); }
  function setS2TratRow(sIdx: number, rIdx: number, key: keyof TratRow, val: string) { setS2State((prev) => prev.map((s, i) => i === sIdx ? { ...s, tratRows: s.tratRows.map((r, j) => j === rIdx ? { ...r, [key]: val } : r) } : s)); }
  function addS3TratRow(sIdx: number) { setS3State((prev) => prev.map((s, i) => i === sIdx ? { ...s, tratRows: [...s.tratRows, TRAT_ROW()] } : s)); }
  function removeS3TratRow(sIdx: number, rIdx: number) { setS3State((prev) => prev.map((s, i) => i === sIdx ? { ...s, tratRows: s.tratRows.filter((_, j) => j !== rIdx) } : s)); }
  function setS3TratRow(sIdx: number, rIdx: number, key: keyof TratRow, val: string) { setS3State((prev) => prev.map((s, i) => i === sIdx ? { ...s, tratRows: s.tratRows.map((r, j) => j === rIdx ? { ...r, [key]: val } : r) } : s)); }

  const f = (key: string) => form[key] ?? "";
  const sf = (key: string, val: string) => setField(key, val);

  const completedPanels = PANELS.filter((p) => {
    const v = Object.keys(form).filter((k) => k.startsWith(p) && form[k]?.trim()).length;
    return v >= 1;
  });
  const progressPct = Math.round((completedPanels.length / PANELS.length) * 100);
  const progressTone = progressPct < 33 ? "#c0392b" : progressPct < 66 ? "#e67e22" : "#27862f";

  const currentEstado = doc?.estado ?? "BORRADOR";
  const estadoToken = ESTADO_TOKEN[currentEstado] ?? "borrador";
  const currentPanelIdx = PANELS.indexOf(currentPanel);

  function getStepStatus(panel: PanelId): "active" | "done" | "pending" {
    if (panel === currentPanel) return "active";
    if (completedPanels.includes(panel)) return "done";
    return "pending";
  }

  function goToPanel(panel: PanelId) { setCurrentPanel(panel); window.scrollTo(0, 0); }
  function goNext() { if (currentPanelIdx < PANELS.length - 1) goToPanel(PANELS[currentPanelIdx + 1]); }
  function goPrev() { if (currentPanelIdx > 0) goToPanel(PANELS[currentPanelIdx - 1]); }

  // OPERADOR can send to review from BORRADOR, EN_ELABORACION, or DEVUELTO (after a return)
  const canEnviarRevision = cap.sendToReview && ["BORRADOR", "EN_ELABORACION", "DEVUELTO"].includes(currentEstado);
  // Form is read-only when approved/closed, or when in review (OPERADOR can't edit while REVISOR is reviewing)
  const isLocked = ["APROBADO", "CERRADO"].includes(currentEstado) ||
    (currentEstado === "EN_REVISION" && !cap.approve);

  function handleGenerarInforme() {
    const fv = (key: string) => form[key] ?? "";

    /* Sección 1: contexto del tratamiento */
    const ctx = rptTable(
      ["Campo", "Valor"],
      [
        ["Actividad de tratamiento", fv("portada-actividad")],
        ["Responsable del tratamiento", fv("portada-responsable")],
        ["Dependencia / Unidad", fv("portada-dependencia")],
        ["Versión del documento", fv("portada-version") || "1.0"],
        ["Fecha de inicio", fv("portada-fecha-inicio")],
        ["Descripción del tratamiento", fv("s1-descripcion")],
        ["Finalidad específica", fv("s1-finalidad")],
        ["Base de licitud", fv("s1-licitud")],
        ["Plazo de conservación", fv("s1-plazo")],
        ["¿Tratamiento a gran escala?", fv("s1-gran-escala")],
      ].filter(([, v]) => v),
      ["35%", "65%"],
    );

    /* Sección 2: categorías de datos y activos */
    const datosHtml = datosRows.filter((r) => r.tipo || r.descripcion).length > 0
      ? rptTable(
          ["Categoría", "Tipo de dato", "Descripción", "Base licitud", "Plazo", "Destinatarios"],
          datosRows.filter((r) => r.tipo || r.descripcion).map((r) => [r.categoria, r.tipo, r.descripcion, r.licitud, r.plazo, r.destinatarios]),
          ["15%", "14%", "24%", "14%", "11%", "22%"],
        )
      : rptNote("No se han registrado categorías de datos personales.");
    const activosHtml = activosRows.filter((r) => r.nombre).length > 0
      ? rptTable(
          ["Activo", "Tipo", "Propietario", "Ubicación", "Controles", "Observaciones"],
          activosRows.filter((r) => r.nombre).map((r) => [r.nombre, r.tipo, r.propietario, r.ubicacion, r.controles, r.observaciones]),
          ["18%", "14%", "14%", "14%", "20%", "20%"],
        )
      : rptNote("No se han registrado activos de información.");

    /* Sección 3: riesgos jurídicos */
    const riesgoJuridico = S2_SCENARIOS
      .map((s, i) => {
        const st = s2State[i];
        if (!st) return null;
        const sid = `s${s.id.replace(/\./g, "")}`;
        const prob = st.fields[`${sid}-prob`] ?? "";
        const imp = st.fields[`${sid}-imp`] ?? "";
        const niv = st.fields[`${sid}-nivel`] ?? "";
        if (!prob && !imp && !niv) return null;
        return [s.id, s.norm, s.title, prob || "—", imp || "—", niv || "—"];
      })
      .filter(Boolean) as string[][];
    const juridHtml = riesgoJuridico.length > 0
      ? rptTable(
          ["ID", "Norma", "Escenario de riesgo", "Probabilidad", "Impacto", "Nivel"],
          riesgoJuridico,
          ["6%", "14%", "44%", "12%", "12%", "12%"],
        )
      : rptNote("No se han evaluado escenarios de riesgos jurídicos.");

    /* Sección 4: riesgos de seguridad */
    const riesgoSeg = S3_SCENARIOS
      .map((s, i) => {
        const st = s3State[i];
        if (!st) return null;
        const sid = `s${s.id.replace(/\./g, "")}`;
        const prob = st.fields[`${sid}-prob`] ?? "";
        const imp = st.fields[`${sid}-imp`] ?? "";
        const niv = st.fields[`${sid}-nivel`] ?? "";
        if (!prob && !imp && !niv) return null;
        return [s.id, s.cat ?? "—", s.title, prob || "—", imp || "—", niv || "—"];
      })
      .filter(Boolean) as string[][];
    const segHtml = riesgoSeg.length > 0
      ? rptTable(
          ["ID", "Categoría", "Escenario de riesgo", "Probabilidad", "Impacto", "Nivel"],
          riesgoSeg,
          ["6%", "15%", "43%", "12%", "12%", "12%"],
        )
      : rptNote("No se han evaluado escenarios de riesgos de seguridad.");

    /* Sección 5: plan de tratamiento */
    const planFiltered = s5Rows.filter((r) => r["medida"] || r["ref"]);
    const planHtml = planFiltered.length > 0
      ? rptTable(
          ["Ref. riesgo", "Medida de tratamiento", "Tipo", "Responsable", "Plazo", "Estado", "Imp. residual"],
          planFiltered.map((r) => [r["ref"] ?? "—", r["medida"] ?? "—", r["tipo"] ?? "—", r["responsable"] ?? "—", r["plazo"] ?? "—", r["estado"] ?? "—", r["impRes"] ?? "—"]),
          ["10%", "28%", "12%", "14%", "10%", "13%", "13%"],
        )
      : rptNote("No se han registrado medidas de tratamiento en el plan.");

    const html = buildInstitutionalReport({
      logoSrc: iessLogoColor,
      title: "Evaluación de Impacto del Tratamiento de Datos Personales",
      subtitle: "Conforme al Art. 29 del Reglamento a la Ley Orgánica de Protección de Datos Personales",
      objective: fv("portada-actividad") || fv("s1-descripcion") || "Evaluación de impacto del tratamiento de datos personales",
      code: trackingCode || doc?.codigo || "EIPDP-S/N",
      metadata: [
        ["Código de seguimiento", trackingCode || doc?.codigo || "—"],
        ["Actividad de tratamiento", fv("portada-actividad")],
        ["Responsable del tratamiento", fv("portada-responsable")],
        ["Dependencia / Unidad", fv("portada-dependencia")],
        ["Versión", fv("portada-version") || "1.0"],
        ["Estado", currentEstado],
        ["Escenarios jurídicos evaluados", String(riesgoJuridico.length)],
        ["Escenarios de seguridad evaluados", String(riesgoSeg.length)],
      ],
      toc: [
        "Contexto del tratamiento",
        "Categorías de datos personales y activos",
        "Evaluación de riesgos jurídicos",
        "Evaluación de riesgos de seguridad",
        "Plan de tratamiento del riesgo",
        "Suscripción",
      ],
      sections: [
        { heading: "1. Contexto del tratamiento", html: ctx },
        { heading: "2. Categorías de datos personales y activos de información", html: datosHtml + activosHtml },
        { heading: "3. Evaluación de riesgos jurídicos (LOPDP)", html: juridHtml },
        { heading: "4. Evaluación de riesgos de seguridad", html: segHtml },
        { heading: "5. Plan de tratamiento del riesgo", html: planHtml },
      ],
      signatures: [
        { role: "Elaborado por", name: fv("portada-responsable") || "—", cargo: fv("portada-dependencia") || "—" },
        { role: "Delegado de Protección de Datos", name: fv("s7-dpd") || "—", cargo: "DNSIPD — IESS" },
        { role: "Autorizado por", name: "Director/a DNSIPD", cargo: "Dirección Nacional de Seguridad de la Información y Protección de Datos" },
      ],
    });

    printInstitutionalReport(html, `EIPDP — ${trackingCode || doc?.codigo || "formulario"}`);
  }

  return (
    <section className="wizard-experience">
      <div className="print-header">
        <img src={iessLogoColor} alt="IESS" />
        <div className="print-header-text">
          <strong>Instituto Ecuatoriano de Seguridad Social</strong>
          <small>Evaluacion de Impacto en Proteccion de Datos Personales (EIPD) — {doc?.codigo ?? "—"}</small>
        </div>
      </div>
      {/* ── HEADER ── */}
      <header className="panel wizard-page-header">
        <div className="wizard-title-block">
          <button
            type="button"
            onClick={() => navigate("/eipd/evaluacion")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand)", fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}
          >
            ← Volver a EIPD
          </button>
          <span className="brand-kicker">Privacidad · LOPDP · {doc?.codigo ?? trackingCode ?? "…"}</span>
          <h2>EIPD</h2>
          <div className="wizard-context-row">
            <span>Codigo <strong>{doc?.codigo ?? trackingCode ?? "—"}</strong></span>
            <span>{completedPanels.length} / {PANELS.length} secciones completadas</span>
          </div>
        </div>
        <div className="wizard-toolbar">
          <div className="eipdp-save-indicator">
            <div className={`eipdp-save-dot${saving ? " saving" : ""}`} />
            <span style={{ fontSize: 12 }}>{saving ? "Guardando…" : isNew ? "Sin guardar" : "Guardado"}</span>
          </div>
          <span className={`status-pill status-pill-${estadoToken}`}>{ESTADO_LABEL[currentEstado] ?? currentEstado}</span>
          {cap.edit && !isLocked && (
            <button
              type="button"
              className="button-secondary"
              disabled={saving || saveMutation.isPending}
              onClick={() => void handleSave()}
            >
              Guardar borrador
            </button>
          )}
          {canEnviarRevision && (
            <button
              type="button"
              className="button-primary"
              disabled={saving || saveMutation.isPending}
              onClick={() => void handleEnviarRevision()}
            >
              Enviar a revision
            </button>
          )}
          {cap.approve && currentEstado === "EN_REVISION" && (
            <button
              type="button"
              className="button-primary"
              disabled={saving || saveMutation.isPending}
              onClick={() => setPendingAction({ estado: "APROBADO", titulo: "Aprobar formulario EIPD", actionLabel: "Confirmar aprobacion", variant: "primary" })}
            >
              Aprobar
            </button>
          )}
          {cap.devolver && currentEstado === "EN_REVISION" && (
            <button
              type="button"
              className="button-secondary"
              disabled={saving || saveMutation.isPending}
              style={{ borderColor: "var(--warning, #d97706)", color: "var(--warning, #d97706)" }}
              onClick={() => setPendingAction({ estado: "DEVUELTO", titulo: "Devolver EIPD para correccion", actionLabel: "Confirmar devolucion", variant: "warning" })}
            >
              Devolver
            </button>
          )}
          {cap.close && currentEstado === "APROBADO" && (
            <button
              type="button"
              className="button-secondary"
              disabled={saving || saveMutation.isPending}
              onClick={() => void saveMutation.mutateAsync({ id: docIdRef.current!, payload: { estado: "CERRADO" } })}
            >
              Cerrar
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              className="button-secondary"
              onClick={handleGenerarInforme}
            >
              Generar informe
            </button>
          )}
          {cap.create && !isNew && (
            <button
              type="button"
              className="button-primary"
              onClick={() => navigate('/eipd/evaluacion/new')}
            >
              + Nuevo EIPD
            </button>
          )}
        </div>
      </header>

      {/* ── ACTIVIDAD CONTEXT BANNER ── */}
      {(doc?.actividadVersion || (isNew && ratActividadParam)) && (
        <div style={{
          background: "rgba(23, 79, 159, 0.07)",
          border: "1px solid rgba(23, 79, 159, 0.18)",
          borderRadius: 8,
          padding: "10px 18px",
          display: "flex",
          gap: 24,
          alignItems: "center",
          fontSize: 13,
          flexWrap: "wrap",
        }}>
          <span style={{ color: "var(--muted)", fontWeight: 600, textTransform: "uppercase", fontSize: 11, letterSpacing: ".06em" }}>Actividad de Tratamiento</span>
          {doc?.actividadVersion ? (
            <>
              <span><strong>{doc.actividadVersion.actividad.codigo}</strong> — {doc.actividadVersion.actividad.nombre}</span>
              {doc.actividadVersion.actividad.rat && (
                <span style={{ color: "var(--muted)" }}>RAT: <strong>{doc.actividadVersion.actividad.rat.codigo}</strong> {doc.actividadVersion.actividad.rat.nombre}</span>
              )}
              <span style={{ color: "var(--muted)" }}>v{doc.actividadVersion.numeroVersion}</span>
            </>
          ) : (
            <>
              <span><strong>{ratActividadParam}</strong>{ratNombreParam ? ` — ${ratNombreParam}` : ""}</span>
              {ratDependenciaParam && <span style={{ color: "var(--muted)" }}>{ratDependenciaParam}</span>}
              <span style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>El vínculo definitivo se crea al guardar</span>
            </>
          )}
        </div>
      )}

      {/* ── OVERVIEW ── */}
      <section className="panel wizard-overview">
        <div className="wizard-overview-row">
          <div>
            <span className="wizard-overview-label">Progreso del formulario</span>
            <p>Complete los campos de cada seccion para avanzar el registro.</p>
          </div>
          <strong className="wizard-progress-value">{progressPct}%</strong>
        </div>
        <div className="progress-bar wizard-progress-bar" style={{ ["--wizard-progress-tone" as string]: progressTone }}>
          <span style={{ width: `${progressPct}%` }} />
        </div>
        <div className="wizard-summary-grid">
          <article className="wizard-summary-card"><span>Codigo</span><strong style={{ fontFamily: "monospace", fontSize: 13 }}>{doc?.codigo ?? "—"}</strong></article>
          <article className="wizard-summary-card"><span>Estado</span><strong>{ESTADO_LABEL[currentEstado] ?? currentEstado}</strong></article>
          <article className="wizard-summary-card"><span>Seccion activa</span><strong>{PANEL_TITLES[currentPanel]}</strong></article>
          <article className="wizard-summary-card"><span>Ultima actualizacion</span><strong>{doc?.updatedAt ? new Date(doc.updatedAt).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</strong></article>
        </div>
      </section>

      {/* ── LAYOUT: RAIL + MAIN ── */}
      <div className="wizard-layout wizard-layout-refined">

        {/* ── SIDEBAR RAIL ── */}
        <aside className="panel wizard-rail">
          <div className="wizard-rail-header">
            <span className="brand-kicker">Secciones</span>
          </div>
          {PANELS.map((panel, index) => {
            const status = getStepStatus(panel);
            return (
              <button
                key={panel}
                type="button"
                className={`wizard-step-card wizard-step-card-${status}`}
                onClick={() => goToPanel(panel)}
              >
                <span className="wizard-step-index">{index + 1}</span>
                <span className="wizard-step-copy">
                  <strong>{PANEL_TITLES[panel]}</strong>
                  <small>{status === "done" ? "Completado" : status === "active" ? "En edicion" : "Pendiente"}</small>
                </span>
              </button>
            );
          })}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="wizard-main">
          <section className="panel wizard-stage" onChange={() => triggerSave()}>
            <div className="wizard-stage-header">
              <div>
                <h3>{PANEL_TITLES[currentPanel]}</h3>
                <p>{PANEL_HELP[currentPanel]}</p>
              </div>
              <div className="wizard-stage-badges">
                {isLocked && (
                  <span className="pill pill-muted">Solo lectura — {ESTADO_LABEL[currentEstado]}</span>
                )}
              </div>
            </div>

            {/* ── PORTADA ── */}
            {currentPanel === "portada" && (
              <>
                <div className="eipdp-card">
                  <div className="eipdp-card-title">Identificación del Documento</div>
                  <div className="eipdp-grid-2">
                    <FG label="Código de seguimiento EIPDP">
                      <input type="text" value={trackingCode} onChange={(e) => setTrkCode(e.target.value)} placeholder="Ej. EIPDP-DNTI-2026-001" />
                    </FG>
                    <FG label="Versión del documento"><input type="text" value={f("portada-version")} onChange={(e) => sf("portada-version", e.target.value)} placeholder="v1.0" /></FG>
                    <FG label="Actividad de tratamiento relacionada"><input type="text" value={f("portada-actividad")} onChange={(e) => sf("portada-actividad", e.target.value)} /></FG>
                    <FG label="Responsable del tratamiento"><input type="text" value={f("portada-responsable")} onChange={(e) => sf("portada-responsable", e.target.value)} /></FG>
                    <FG label="Dependencia / Unidad"><input type="text" value={f("portada-dependencia")} onChange={(e) => sf("portada-dependencia", e.target.value)} /></FG>
                    <FG label="Fecha de inicio"><input type="date" value={f("portada-fecha-inicio")} onChange={(e) => sf("portada-fecha-inicio", e.target.value)} /></FG>
                  </div>
                </div>
                <div className="eipdp-card">
                  <div className="eipdp-card-title">Control de Versiones</div>
                  <div className="eipdp-tbl-wrap">
                    <table className="eipdp-tbl">
                      <thead><tr><th>Versión</th><th>Fecha</th><th>Descripción de cambios</th><th>Responsable</th></tr></thead>
                      <tbody>
                        <tr>
                          <td><input type="text" defaultValue="1.0" onChange={(e) => sf("portada-v1-ver", e.target.value)} /></td>
                          <td><input type="date" value={f("portada-v1-fecha")} onChange={(e) => sf("portada-v1-fecha", e.target.value)} /></td>
                          <td><input type="text" value={f("portada-v1-desc")} onChange={(e) => sf("portada-v1-desc", e.target.value)} placeholder="Versión inicial" /></td>
                          <td><input type="text" value={f("portada-v1-resp")} onChange={(e) => sf("portada-v1-resp", e.target.value)} /></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {/* ── S1 CONTEXTO ── */}
            {currentPanel === "s1" && (
              <>
                <div className="eipdp-card">
                  <div className="eipdp-card-title">Descripción del Tratamiento</div>
                  <FG label="Nombre y descripción de la actividad de tratamiento">
                    <textarea value={f("s1-descripcion")} onChange={(e) => sf("s1-descripcion", e.target.value)} />
                  </FG>
                  <div className="eipdp-grid-2">
                    <FG label="Finalidad específica"><textarea value={f("s1-finalidad")} onChange={(e) => sf("s1-finalidad", e.target.value)} /></FG>
                    <FG label="Base de licitud"><textarea value={f("s1-licitud")} onChange={(e) => sf("s1-licitud", e.target.value)} /></FG>
                    <FG label="Plazo de conservación"><input type="text" value={f("s1-plazo")} onChange={(e) => sf("s1-plazo", e.target.value)} /></FG>
                    <FG label="¿Gran escala?">
                      <select value={f("s1-gran-escala")} onChange={(e) => sf("s1-gran-escala", e.target.value)}>
                        <option value="">— Seleccionar —</option><option>Sí</option><option>No</option>
                      </select>
                    </FG>
                  </div>
                </div>
                <div className="eipdp-card">
                  <div className="eipdp-card-title">Categorías de Datos Personales Tratados</div>
                  <div className="eipdp-tbl-wrap">
                    <table className="eipdp-tbl">
                      <thead><tr><th>Categoría</th><th>Tipo de dato</th><th>Descripción</th><th>Base licitud</th><th>Plazo conservación</th><th>Destinatarios</th></tr></thead>
                      <tbody>
                        {datosRows.map((row, i) => (
                          <tr key={i}>
                            <td>
                              <select value={row.categoria} onChange={(e) => setDatosRows((r) => r.map((x, j) => j === i ? { ...x, categoria: e.target.value } : x))}>
                                <option>Datos simples</option><option>Datos comportamentales</option><option>Datos financieros</option><option>Datos sensibles / categorías especiales</option><option>Otros</option>
                              </select>
                            </td>
                            {(["tipo", "descripcion", "plazo", "destinatarios"] as const).map((k) => (
                              <td key={k}><input type="text" value={row[k]} onChange={(e) => setDatosRows((r) => r.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} /></td>
                            ))}
                            <td>
                              <select value={row.licitud} onChange={(e) => setDatosRows((r) => r.map((x, j) => j === i ? { ...x, licitud: e.target.value } : x))}>
                                <option>Consentimiento</option><option>Contrato</option><option>Obligación legal</option><option>Interés legítimo</option><option>Misión pública</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="eipdp-add-row" onClick={() => setDatosRows((r) => [...r, DATOS_ROW()])}>+ Agregar categoría de dato</button>
                </div>
                <div className="eipdp-card">
                  <div className="eipdp-card-title">Activos de Información Involucrados</div>
                  <div className="eipdp-tbl-wrap">
                    <table className="eipdp-tbl">
                      <thead><tr><th>Nombre del activo</th><th>Tipo</th><th>Propietario</th><th>Ubicación</th><th>Controles existentes</th><th>Observaciones</th></tr></thead>
                      <tbody>
                        {activosRows.map((row, i) => (
                          <tr key={i}>
                            <td><input type="text" value={row.nombre} onChange={(e) => setActivosRows((r) => r.map((x, j) => j === i ? { ...x, nombre: e.target.value } : x))} /></td>
                            <td>
                              <select value={row.tipo} onChange={(e) => setActivosRows((r) => r.map((x, j) => j === i ? { ...x, tipo: e.target.value } : x))}>
                                <option>Base de datos / repositorio</option><option>Servidor / almacenamiento</option><option>Nube / SaaS</option><option>Dispositivo móvil</option><option>Papel / archivo físico</option>
                              </select>
                            </td>
                            {(["propietario", "ubicacion", "controles", "observaciones"] as const).map((k) => (
                              <td key={k}><input type="text" value={row[k]} onChange={(e) => setActivosRows((r) => r.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))} /></td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="eipdp-add-row" onClick={() => setActivosRows((r) => [...r, ACTIVO_ROW()])}>+ Agregar activo</button>
                </div>
              </>
            )}

            {/* ── S2 RIESGOS JURÍDICOS ── */}
            {currentPanel === "s2" && (
              <>
                <div className="eipdp-hint">Identifique y analice los escenarios de riesgo jurídico para los derechos y libertades de los titulares. Documente amenazas, vulnerabilidades, probabilidad de ocurrencia e impacto inherente.</div>
                {S2_SCENARIOS.map((scenario, sIdx) => (
                  <ScenarioAccordion
                    key={scenario.id}
                    scenario={scenario}
                    isOpen={s2State[sIdx].open}
                    onToggle={() => toggleS2(sIdx)}
                    fields={s2State[sIdx].fields}
                    onFieldChange={(k, v) => setS2Field(sIdx, k, v)}
                    tratRows={s2State[sIdx].tratRows}
                    onAddTratRow={() => addS2TratRow(sIdx)}
                    onRemoveTratRow={(rIdx) => removeS2TratRow(sIdx, rIdx)}
                    onTratRowChange={(rIdx, k, v) => setS2TratRow(sIdx, rIdx, k, v)}
                    isJuridical
                  />
                ))}
              </>
            )}

            {/* ── S3 RIESGOS DE SEGURIDAD ── */}
            {currentPanel === "s3" && (
              <>
                <div className="eipdp-hint">Identifique los escenarios de riesgo de seguridad (confidencialidad, integridad, disponibilidad) para los datos personales tratados.</div>
                <div className="eipdp-cat-bar">
                  {["all", "confidencialidad", "integridad", "disponibilidad"].map((cat) => (
                    <button key={cat} type="button" className={`eipdp-cat-btn${s3Cat === cat ? " active" : ""}`} onClick={() => setS3Cat(cat)}>
                      {cat === "all" ? "Todos" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
                {S3_SCENARIOS.filter((s) => s3Cat === "all" || s.cat === s3Cat).map((scenario) => {
                  const sIdx = S3_SCENARIOS.findIndex((s) => s.id === scenario.id);
                  return (
                    <ScenarioAccordion
                      key={scenario.id}
                      scenario={scenario}
                      isOpen={s3State[sIdx].open}
                      onToggle={() => toggleS3(sIdx)}
                      fields={s3State[sIdx].fields}
                      onFieldChange={(k, v) => setS3Field(sIdx, k, v)}
                      tratRows={s3State[sIdx].tratRows}
                      onAddTratRow={() => addS3TratRow(sIdx)}
                      onRemoveTratRow={(rIdx) => removeS3TratRow(sIdx, rIdx)}
                      onTratRowChange={(rIdx, k, v) => setS3TratRow(sIdx, rIdx, k, v)}
                      isJuridical={false}
                    />
                  );
                })}
              </>
            )}

            {/* ── S4 REGISTRO GENERAL ── */}
            {currentPanel === "s4" && (
              <div className="eipdp-card">
                <div className="eipdp-card-title">4. Registro General de Evaluación de Riesgos</div>
                <div className="eipdp-tbl-wrap">
                  <table className="eipdp-tbl">
                    <thead><tr><th>Ref.</th><th>Descripción del riesgo</th><th>Propietario</th><th>Probabilidad</th><th>Impacto inherente</th><th>Impacto residual</th><th>Prioridad</th><th>Observaciones</th></tr></thead>
                    <tbody>
                      {s4Rows.map((row, i) => (
                        <tr key={i}>
                          <td><input type="text" placeholder="R-001" value={row.ref ?? ""} onChange={(e) => setS4Rows((r) => r.map((x, j) => j === i ? { ...x, ref: e.target.value } : x))} /></td>
                          <td><textarea value={row.desc ?? ""} onChange={(e) => setS4Rows((r) => r.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} /></td>
                          <td><input type="text" value={row.owner ?? ""} onChange={(e) => setS4Rows((r) => r.map((x, j) => j === i ? { ...x, owner: e.target.value } : x))} /></td>
                          {["prob", "impInh", "impRes"].map((k) => (
                            <td key={k}>
                              <select style={riskStyle(row[k] ?? "")} value={row[k] ?? ""} onChange={(e) => setS4Rows((r) => r.map((x, j) => j === i ? { ...x, [k]: e.target.value } : x))}>
                                <option value="">—</option><option>Muy bajo</option><option>Bajo</option><option>Medio</option><option>Alto</option><option>Muy alto</option>
                              </select>
                            </td>
                          ))}
                          <td>
                            <select value={row.prioridad ?? ""} onChange={(e) => setS4Rows((r) => r.map((x, j) => j === i ? { ...x, prioridad: e.target.value } : x))}>
                              <option value="">—</option><option>Alta</option><option>Media</option><option>Baja</option>
                            </select>
                          </td>
                          <td><textarea value={row.obs ?? ""} onChange={(e) => setS4Rows((r) => r.map((x, j) => j === i ? { ...x, obs: e.target.value } : x))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="eipdp-add-row" onClick={() => setS4Rows((r) => [...r, {}])}>+ Agregar riesgo</button>
              </div>
            )}

            {/* ── S5 PLAN DE TRATAMIENTO ── */}
            {currentPanel === "s5" && (
              <div className="eipdp-card">
                <div className="eipdp-card-title">5. Plan de Tratamiento y Seguimiento</div>
                <div className="eipdp-tbl-wrap">
                  <table className="eipdp-tbl">
                    <thead><tr><th>Ref. riesgo</th><th>Medida de tratamiento</th><th>Tipo de control</th><th>Responsable</th><th>Plazo</th><th>Evidencia</th><th>Estado</th><th>Impacto residual</th></tr></thead>
                    <tbody>
                      {s5Rows.map((row, i) => (
                        <tr key={i}>
                          <td><input type="text" placeholder="R-001" value={row.ref ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, ref: e.target.value } : x))} /></td>
                          <td><textarea value={row.medida ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, medida: e.target.value } : x))} /></td>
                          <td>
                            <select value={row.tipo ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, tipo: e.target.value } : x))}>
                              <option>Jurídico</option><option>Organizacional</option><option>Técnico</option><option>Jurídico / Organizacional</option><option>Organizacional / Técnico</option>
                            </select>
                          </td>
                          <td><input type="text" value={row.responsable ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, responsable: e.target.value } : x))} /></td>
                          <td><input type="date" value={row.plazo ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, plazo: e.target.value } : x))} /></td>
                          <td><input type="text" value={row.evidencia ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, evidencia: e.target.value } : x))} placeholder="Anexo A-__" /></td>
                          <td>
                            <select value={row.estado ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, estado: e.target.value } : x))}>
                              <option>Pendiente</option><option>En curso</option><option>Implementado</option>
                            </select>
                          </td>
                          <td>
                            <select style={riskStyle(row.impRes ?? "")} value={row.impRes ?? ""} onChange={(e) => setS5Rows((r) => r.map((x, j) => j === i ? { ...x, impRes: e.target.value } : x))}>
                              <option value="">—</option><option>Muy bajo</option><option>Bajo</option><option>Medio</option><option>Alto</option><option>Muy alto</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="eipdp-add-row" onClick={() => setS5Rows((r) => [...r, {}])}>+ Agregar medida</button>
              </div>
            )}

            {/* ── S6 ANEXOS ── */}
            {currentPanel === "s6" && (
              <div className="eipdp-card">
                <div className="eipdp-card-title">6. Índice de Anexos y Evidencias</div>
                <div className="eipdp-tbl-wrap">
                  <table className="eipdp-tbl">
                    <thead><tr><th>Referencia</th><th>Descripción del anexo</th><th>Responsable</th><th>Fecha</th><th>Ubicación / URL</th></tr></thead>
                    <tbody>
                      {s6Rows.map((row, i) => (
                        <tr key={i}>
                          <td><input type="text" placeholder="A-01" value={row.ref ?? ""} onChange={(e) => setS6Rows((r) => r.map((x, j) => j === i ? { ...x, ref: e.target.value } : x))} /></td>
                          <td><input type="text" value={row.desc ?? ""} onChange={(e) => setS6Rows((r) => r.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} /></td>
                          <td><input type="text" value={row.responsable ?? ""} onChange={(e) => setS6Rows((r) => r.map((x, j) => j === i ? { ...x, responsable: e.target.value } : x))} /></td>
                          <td><input type="date" value={row.fecha ?? ""} onChange={(e) => setS6Rows((r) => r.map((x, j) => j === i ? { ...x, fecha: e.target.value } : x))} /></td>
                          <td><input type="text" value={row.ubicacion ?? ""} onChange={(e) => setS6Rows((r) => r.map((x, j) => j === i ? { ...x, ubicacion: e.target.value } : x))} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="eipdp-add-row" onClick={() => setS6Rows((r) => [...r, {}])}>+ Agregar anexo</button>
              </div>
            )}

            {/* ── S7 DECLARACIÓN ── */}
            {currentPanel === "s7" && (
              <>
                <div className="eipdp-card">
                  <div className="eipdp-card-title">7. Declaración de Revisión y Aprobación</div>
                  <FG label="Conclusión de la EIPDP">
                    <select value={f("s7-conclusion")} onChange={(e) => sf("s7-conclusion", e.target.value)}>
                      <option value="">— Seleccionar conclusión —</option>
                      <option>Continuar tratamiento sin medidas adicionales</option>
                      <option>Continuar tratamiento con controles adicionales identificados</option>
                      <option>Suspender o rediseñar el tratamiento</option>
                      <option>Consulta o actuación adicional requerida ante la SPDP</option>
                    </select>
                  </FG>
                  <FG label="Riesgos no aceptables identificados"><textarea value={f("s7-riesgos")} onChange={(e) => sf("s7-riesgos", e.target.value)} style={{ minHeight: 70 }} /></FG>
                  <FG label="Decisión sobre el tratamiento evaluado"><textarea value={f("s7-decision")} onChange={(e) => sf("s7-decision", e.target.value)} style={{ minHeight: 70 }} /></FG>
                  <div className="eipdp-grid-2">
                    <FG label="Fecha de próxima revisión"><input type="date" value={f("s7-fecha")} onChange={(e) => sf("s7-fecha", e.target.value)} /></FG>
                    <FG label="Código de seguimiento">
                      <input type="text" value={trackingCode} readOnly style={{ background: "var(--surface-subtle)", color: "var(--iess-navy)", fontWeight: 700, letterSpacing: ".7px" }} />
                    </FG>
                  </div>
                </div>
                <div className="eipdp-card">
                  <div className="eipdp-card-title">Firmas de Aprobación</div>
                  <div className="eipdp-hint">Registre nombre, cargo y referencia de la firma electrónica certificada conforme a la Ley de Comercio Electrónico del Ecuador y el EGSI.</div>
                  <div className="eipdp-sig-grid">
                    {[{ role: "Elaborado por", prefix: "elab" }, { role: "Revisado por DPD / Responsable interno", prefix: "rev" }, { role: "Aprobado por Alta Dirección", prefix: "apr" }].map(({ role, prefix }) => (
                      <div key={prefix} className="eipdp-sig-card">
                        <div className="eipdp-sig-role">{role}</div>
                        <div className="eipdp-sig-body">
                          <FG label="Nombre completo"><input type="text" value={f(`s7-${prefix}-nombre`)} onChange={(e) => sf(`s7-${prefix}-nombre`, e.target.value)} /></FG>
                          <FG label="Cargo"><input type="text" value={f(`s7-${prefix}-cargo`)} onChange={(e) => sf(`s7-${prefix}-cargo`, e.target.value)} /></FG>
                          <FG label="Fecha"><input type="date" value={f(`s7-${prefix}-fecha`)} onChange={(e) => sf(`s7-${prefix}-fecha`, e.target.value)} /></FG>
                          <FG label="Referencia firma electrónica"><input type="text" value={f(`s7-${prefix}-firma`)} onChange={(e) => sf(`s7-${prefix}-firma`, e.target.value)} placeholder="N.º token / archivo / hash" /></FG>
                          <div className="eipdp-sig-area">Firma electrónica certificada<br /><small>(adjuntar imagen, QR o referencia del sistema de gestión documental)</small></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>

          {/* ── ACTION BAR ── */}
          <div className="wizard-action-bar">
            <button type="button" className="button-secondary" onClick={() => navigate("/eipd/evaluacion")}>
              Cancelar
            </button>
            <div className="wizard-footer-actions">
              <button
                type="button"
                className="button-secondary"
                disabled={currentPanelIdx === 0}
                onClick={goPrev}
              >
                Anterior
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={currentPanelIdx === PANELS.length - 1}
                onClick={goNext}
              >
                Siguiente
              </button>
            </div>
            {cap.edit && !isLocked && (
              <button
                type="button"
                className="button-primary"
                disabled={saving || saveMutation.isPending}
                onClick={() => void handleSave()}
              >
                {saving || saveMutation.isPending ? "Guardando…" : "Guardar borrador"}
              </button>
            )}
            {canEnviarRevision && (
              <button
                type="button"
                className="button-primary"
                style={{ background: "var(--iess-navy)" }}
                disabled={saving || saveMutation.isPending}
                onClick={() => void handleEnviarRevision()}
              >
                Enviar a revision
              </button>
            )}
            {cap.approve && currentEstado === "EN_REVISION" && (
              <button
                type="button"
                className="button-primary"
                disabled={saving || saveMutation.isPending}
                onClick={() => setPendingAction({ estado: "APROBADO", titulo: "Aprobar formulario EIPD", actionLabel: "Confirmar aprobacion", variant: "primary" })}
              >
                Aprobar
              </button>
            )}
            {cap.devolver && currentEstado === "EN_REVISION" && (
              <button
                type="button"
                className="button-secondary"
                disabled={saving || saveMutation.isPending}
                style={{ borderColor: "var(--warning, #d97706)", color: "var(--warning, #d97706)" }}
                onClick={() => setPendingAction({ estado: "DEVUELTO", titulo: "Devolver EIPD para correccion", actionLabel: "Confirmar devolucion", variant: "warning" })}
              >
                Devolver
              </button>
            )}
            {cap.close && currentEstado === "APROBADO" && (
              <button
                type="button"
                className="button-secondary"
                disabled={saving || saveMutation.isPending}
                onClick={() => void saveMutation.mutateAsync({ id: docIdRef.current!, payload: { estado: "CERRADO" } })}
              >
                Cerrar EIPD
              </button>
            )}
            {isLocked && (
              <span style={{ fontSize: 12, color: "var(--muted)", padding: "0 8px" }}>
                {ESTADO_LABEL[currentEstado]}
              </span>
            )}
          </div>
        </div>
      </div>
      {pendingAction && (
        <ConfirmWithMotivoModal
          title={pendingAction.titulo}
          description={`Formulario EIPD ${doc?.codigo ?? ""}`}
          actionLabel={pendingAction.actionLabel}
          variant={pendingAction.variant}
          isSubmitting={saveMutation.isPending}
          onConfirm={(motivo) => void executeEstadoAction(pendingAction, motivo)}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </section>
  );
}

function FG({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="eipdp-fg">
      <label>{label}</label>
      {children}
    </div>
  );
}

function ScenarioAccordion({
  scenario, isOpen, onToggle, fields, onFieldChange,
  tratRows, onAddTratRow, onRemoveTratRow, onTratRowChange, isJuridical,
}: {
  scenario: Scenario;
  isOpen: boolean;
  onToggle: () => void;
  fields: Record<string, string>;
  onFieldChange: (key: string, val: string) => void;
  tratRows: TratRow[];
  onAddTratRow: () => void;
  onRemoveTratRow: (i: number) => void;
  onTratRowChange: (i: number, key: keyof TratRow, val: string) => void;
  isJuridical: boolean;
}) {
  const sid = `s${scenario.id.replace(/\./g, "")}`;
  const catBadge = scenario.cat
    ? <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 8, background: "rgba(255,255,255,.2)", marginRight: 6 }}>{scenario.cat}</span>
    : null;

  const probOpts = isJuridical
    ? ["Insignificante", "Poco probable", "Probable", "Muy probable", "Inminente"]
    : ["Muy baja", "Baja", "Media", "Alta", "Muy alta"];
  const probLabel = isJuridical ? "Probabilidad de ocurrencia inherente" : "Frecuencia de ocurrencia inherente";
  const impOpts = ["Muy bajo", "Bajo", "Medio", "Alto", "Muy alto"];
  const fv = (k: string) => fields[k] ?? "";
  const sv = (k: string, v: string) => onFieldChange(k, v);

  return (
    <div className="eipdp-acc">
      <button type="button" className={`eipdp-acc-hd${isOpen ? " open" : ""}`} onClick={onToggle}>
        <span className="eipdp-acc-id">{scenario.id}</span>
        {catBadge}
        <span className="eipdp-acc-title">{scenario.title}</span>
        <span className="eipdp-acc-norm">{scenario.norm}</span>
        <span className="eipdp-acc-ic">▼</span>
      </button>
      {isOpen && (
        <div className="eipdp-acc-bd open">
          {scenario.extra && isJuridical && (
            <div className="eipdp-hint" style={{ marginBottom: 12 }}>Añada artículos LOPDP aplicables en el campo de concordancia normativa.</div>
          )}
          <div className="eipdp-grid-2">
            <FG label="Actividad de tratamiento relacionada"><textarea value={fv(`${sid}-act`)} onChange={(e) => sv(`${sid}-act`, e.target.value)} /></FG>
            <FG label="Propietario del riesgo"><input type="text" value={fv(`${sid}-owner`)} onChange={(e) => sv(`${sid}-owner`, e.target.value)} /></FG>
          </div>
          <div className="eipdp-sdiv">Identificación del riesgo</div>
          {scenario.qs?.map((q, qi) => (
            <FG key={qi} label={q}><textarea value={fv(`${sid}-q${qi}`)} onChange={(e) => sv(`${sid}-q${qi}`, e.target.value)} /></FG>
          ))}
          {!scenario.qs && [
            "¿Qué comunidades de amenaza se pueden vincular al escenario de riesgo?",
            "¿Qué mecanismos pueden utilizar las comunidades de amenaza?",
            "¿Qué vulnerabilidades organizacionales se han detectado?",
            "¿Qué vulnerabilidades técnicas se han detectado?",
            "¿Qué consecuencias pueden sufrir los titulares si el riesgo se materializa?",
          ].map((q, qi) => (
            <FG key={qi} label={q}><textarea value={fv(`${sid}-q${qi}`)} onChange={(e) => sv(`${sid}-q${qi}`, e.target.value)} /></FG>
          ))}
          <div className="eipdp-grid-2">
            <FG label="Amenaza(s) / comunidad(es) de amenaza"><textarea value={fv(`${sid}-amenaza`)} onChange={(e) => sv(`${sid}-amenaza`, e.target.value)} /></FG>
            <FG label="Rationale de amenaza"><textarea value={fv(`${sid}-rat-am`)} onChange={(e) => sv(`${sid}-rat-am`, e.target.value)} placeholder="Referenciar evidencia: auditoría, threat intelligence, logs…" /></FG>
          </div>
          <div className="eipdp-grid-2">
            <FG label="Vulnerabilidad(es) jurídicas, organizacionales y/o técnicas"><textarea value={fv(`${sid}-vuln`)} onChange={(e) => sv(`${sid}-vuln`, e.target.value)} /></FG>
            <FG label="Rationale de vulnerabilidad"><textarea value={fv(`${sid}-rat-vuln`)} onChange={(e) => sv(`${sid}-rat-vuln`, e.target.value)} placeholder="Referenciar evidencia en anexos" /></FG>
          </div>
          <div className="eipdp-sdiv">Análisis del riesgo</div>
          <div className="eipdp-grid-2">
            <FG label={probLabel}>
              <select style={riskStyle(fv(`${sid}-prob`))} value={fv(`${sid}-prob`)} onChange={(e) => sv(`${sid}-prob`, e.target.value)}>
                <option value="">— Seleccionar —</option>
                {probOpts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FG>
            <FG label="Rationale de probabilidad / frecuencia"><textarea value={fv(`${sid}-rat-prob`)} onChange={(e) => sv(`${sid}-rat-prob`, e.target.value)} /></FG>
          </div>
          <div className="eipdp-grid-2">
            <FG label="Impacto inherente en titulares promedio">
              <select style={riskStyle(fv(`${sid}-imp-prom`))} value={fv(`${sid}-imp-prom`)} onChange={(e) => sv(`${sid}-imp-prom`, e.target.value)}>
                <option value="">— Seleccionar —</option>
                {impOpts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FG>
            <FG label="Impacto inherente en titulares especialmente vulnerables">
              <select style={riskStyle(fv(`${sid}-imp-vuln`))} value={fv(`${sid}-imp-vuln`)} onChange={(e) => sv(`${sid}-imp-vuln`, e.target.value)}>
                <option value="">— Seleccionar —</option>
                {impOpts.map((o) => <option key={o}>{o}</option>)}
              </select>
            </FG>
          </div>
          <FG label="Rationale de impacto"><textarea value={fv(`${sid}-rat-imp`)} onChange={(e) => sv(`${sid}-rat-imp`, e.target.value)} /></FG>
          <div className="eipdp-sdiv">Tratamiento del riesgo</div>
          <div className="eipdp-tbl-wrap">
            <table className="eipdp-tbl">
              <thead>
                <tr><th>Medida de tratamiento</th><th>Tipo de control</th><th>Responsable</th><th>Plazo</th><th>Estado</th><th>Evidencia</th><th style={{ width: 36 }}></th></tr>
              </thead>
              <tbody>
                {tratRows.map((row, ri) => (
                  <tr key={ri}>
                    <td><textarea value={row.medida} onChange={(e) => onTratRowChange(ri, "medida", e.target.value)} /></td>
                    <td>
                      <select value={row.tipo} onChange={(e) => onTratRowChange(ri, "tipo", e.target.value)}>
                        <option>Jurídico</option><option>Organizacional</option><option>Técnico</option><option>Jurídico / Organizacional</option><option>Organizacional / Técnico</option>
                      </select>
                    </td>
                    <td><input type="text" value={row.responsable} onChange={(e) => onTratRowChange(ri, "responsable", e.target.value)} /></td>
                    <td><input type="date" value={row.plazo} onChange={(e) => onTratRowChange(ri, "plazo", e.target.value)} /></td>
                    <td>
                      <select value={row.estado} onChange={(e) => onTratRowChange(ri, "estado", e.target.value)}>
                        <option>Pendiente</option><option>En curso</option><option>Implementado</option>
                      </select>
                    </td>
                    <td><input type="text" value={row.evidencia} onChange={(e) => onTratRowChange(ri, "evidencia", e.target.value)} placeholder="Anexo A-__" /></td>
                    <td><button type="button" className="eipdp-del-row" onClick={() => onRemoveTratRow(ri)}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" className="eipdp-add-row" onClick={onAddTratRow}>+ Agregar medida</button>
        </div>
      )}
    </div>
  );
}
