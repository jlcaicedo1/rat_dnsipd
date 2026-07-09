import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import { EJES, type EjeKey } from "./checklist-dpd-data";
import { useChecklistDpdCreate, useChecklistDpdOne, useChecklistDpdSave, type ChecklistDpdPatch } from "./checklist-dpd.api";
import "./checklist-dpd.css";

type Nivel = 0 | 1 | 2 | 3 | "na" | null;
type ControlState = { id: number; nivel: Nivel; evidencia: string };
export type AppState = Record<EjeKey, ControlState[]>;
export type PlanRow = { eje?: string; hallazgo?: string; accion?: string; responsable?: string; prioridad?: string; fechaIni?: string; fechaLim?: string; estado?: string };
export type FormData = { proceso: string; responsable: string; dependencia: string; periodo: string; version: string; codigo: string };
type TabKey = "datos" | EjeKey | "resumen" | "plan";
const TABS: TabKey[] = ["datos", "priv", "sec", "risk", "resumen", "plan"];
const NIV_LABELS = [0, 1, 2, 3, "na"] as const;

const TAB_TITLES: Record<TabKey, string> = {
  datos: "Datos generales",
  priv: "DevPrivOps",
  sec: "DevSecOps",
  risk: "DevRiskOps",
  resumen: "Resumen GAP",
  plan: "Plan de accion",
};

const TAB_HELP: Record<TabKey, string> = {
  datos: "Proceso, responsable, dependencia, periodo y version del checklist.",
  priv: "Controles de privacidad por diseno — minimizacion, consentimiento, acceso.",
  sec: "Controles de seguridad — cifrado, autenticacion, gestion de vulnerabilidades.",
  risk: "Controles de gestion de riesgos — evaluacion, tratamiento y monitoreo.",
  resumen: "Diagnostico GAP consolidado por eje y nivel de madurez global.",
  plan: "Acciones correctivas priorizadas con responsable, fechas y seguimiento.",
};

const ESTADO_LABEL: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revision",
  DEVUELTO: "Devuelto por DPD",
  APROBADO: "Aprobado",
  CERRADO: "Cerrado",
};

const ESTADO_TOKEN: Record<string, string> = {
  BORRADOR: "borrador",
  EN_REVISION: "en-revision",
  DEVUELTO: "borrador",
  APROBADO: "vigente",
  CERRADO: "archivado",
};

function makeInitialState(): AppState {
  return {
    priv: EJES[0].data.map((it) => ({ id: it.id, nivel: null, evidencia: "" })),
    sec:  EJES[1].data.map((it) => ({ id: it.id, nivel: null, evidencia: "" })),
    risk: EJES[2].data.map((it) => ({ id: it.id, nivel: null, evidencia: "" })),
  };
}

function makeInitialForm(): FormData {
  return { proceso: "", responsable: "", dependencia: "", periodo: "", version: "1.0", codigo: "" };
}

function calcEje(arr: ControlState[]) {
  const evaluated = arr.filter((s) => s.nivel !== null);
  const numeric = evaluated.filter((s) => s.nivel !== "na").map((s) => s.nivel as number);
  const avg = numeric.length ? numeric.reduce((a, b) => a + b, 0) / numeric.length : null;
  const brecha = avg !== null ? 3 - avg : null;
  const dist = { 0: 0, 1: 0, 2: 0, 3: 0, na: 0 } as Record<string, number>;
  evaluated.forEach((s) => { dist[String(s.nivel)]++; });
  return { avg, brecha, dist, evaluated: evaluated.length, total: arr.length, allNA: evaluated.length === arr.length && numeric.length === 0 };
}

function riesgoLabel(avg: number | null): string {
  if (avg === null) return "—";
  if (avg < 0.75) return "CRITICO";
  if (avg < 1.5) return "ALTO";
  if (avg < 2.5) return "MEDIO";
  return "BAJO";
}

function barColor(avg: number | null): string {
  if (avg === null) return "var(--muted)";
  if (avg < 0.75) return "#c0392b";
  if (avg < 1.5) return "#e67e22";
  if (avg < 2.5) return "#c9a706";
  return "#27862f";
}

function rowClass(nivel: Nivel): string {
  if (nivel === null) return "";
  if (nivel === "na") return "rna";
  return `r${nivel}`;
}

function nivelBtnClass(btn: typeof NIV_LABELS[number], current: Nivel): string {
  const base = btn === "na" ? "nivel-btn btn-na" : "nivel-btn";
  if (current === btn) return `${base} active-${btn}`;
  return base;
}

export function ChecklistDpdPage() {
  const { id: idParam } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cap = getRoleCapabilities(user?.role).checklistDpd;
  const isNew = idParam === 'new';
  const docId = isNew ? 0 : Number(idParam);
  const [activeTab, setActiveTab] = useState<TabKey>("datos");
  const [state, setState] = useState<AppState>(makeInitialState);
  const [plan, setPlan] = useState<PlanRow[]>([{}]);
  const [form, setForm] = useState<FormData>(makeInitialForm);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docIdRef = useRef<number | null>(null);

  const { data: doc } = useChecklistDpdOne(docId);
  const saveMutation = useChecklistDpdSave();
  const createMutation = useChecklistDpdCreate();

  useEffect(() => {
    if (!doc || docIdRef.current === doc.id) return;
    docIdRef.current = doc.id;
    if (doc.controles) {
      const c = doc.controles as AppState;
      if (c.priv && c.sec && c.risk) setState(c);
    }
    if (Array.isArray(doc.planRows)) setPlan(doc.planRows as PlanRow[]);
    if (doc.formData) setForm((f) => ({ ...f, ...doc.formData }));
  }, [doc]);

  useEffect(() => {
    if (!docIdRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const id = docIdRef.current;
    setSaving(true);
    saveTimer.current = setTimeout(() => {
      saveMutation.mutate({ id, payload: { controles: state, planRows: plan, formData: form } });
      setSaving(false);
    }, 1200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, plan, form]);

  async function handleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    if (isNew || !docIdRef.current) {
      const created = await createMutation.mutateAsync(undefined);
      docIdRef.current = created.id;
      await saveMutation.mutateAsync({ id: created.id, payload: { controles: state, planRows: plan, formData: form } });
      setSaving(false);
      navigate(`/checklist-dpd/${created.id}`, { replace: true });
      return;
    }
    await saveMutation.mutateAsync({ id: docIdRef.current, payload: { controles: state, planRows: plan, formData: form } });
    setSaving(false);
  }

  async function handleEnviarRevision() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    if (isNew || !docIdRef.current) {
      const created = await createMutation.mutateAsync(undefined);
      docIdRef.current = created.id;
      await saveMutation.mutateAsync({ id: created.id, payload: { controles: state, planRows: plan, formData: form, estado: "EN_REVISION" } });
      setSaving(false);
      navigate(`/checklist-dpd/${created.id}`, { replace: true });
      return;
    }
    await saveMutation.mutateAsync({
      id: docIdRef.current,
      payload: { controles: state, planRows: plan, formData: form, estado: "EN_REVISION" },
    });
    setSaving(false);
  }

  const stats = useMemo(() => EJES.map((eje) => calcEje(state[eje.key])), [state]);

  const globalAvg = useMemo(() => {
    const avgs = stats.filter((s) => !s.allNA && s.avg !== null).map((s) => s.avg as number);
    return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
  }, [stats]);

  const totalEval = stats.reduce((a, s) => a + s.evaluated, 0);
  const totalItems = stats.reduce((a, s) => a + s.total, 0);

  function setNivel(ejeKey: EjeKey, idx: number, nivel: Nivel) {
    setState((prev) => {
      const arr = [...prev[ejeKey]];
      arr[idx] = { ...arr[idx], nivel: arr[idx].nivel === nivel ? null : nivel };
      return { ...prev, [ejeKey]: arr };
    });
  }

  function setEvidencia(ejeKey: EjeKey, idx: number, value: string) {
    setState((prev) => {
      const arr = [...prev[ejeKey]];
      arr[idx] = { ...arr[idx], evidencia: value };
      return { ...prev, [ejeKey]: arr };
    });
  }

  function markAllNA(ejeKey: EjeKey) {
    setState((prev) => ({
      ...prev,
      [ejeKey]: prev[ejeKey].map((s) => ({ ...s, nivel: "na" as Nivel })),
    }));
  }

  const tabProgress = (ejeKey: EjeKey, idx: number) => {
    const s = stats[idx];
    const label = s.evaluated === s.total ? "full" : "";
    return { count: `${s.evaluated}/${s.total}`, full: label };
  };

  const currentTabIdx = TABS.indexOf(activeTab);
  const currentEstado = doc?.estado ?? "BORRADOR";
  const estadoToken = ESTADO_TOKEN[currentEstado] ?? "borrador";
  const canEnviarRevision = cap.sendToReview && ["BORRADOR", "DEVUELTO"].includes(currentEstado);
  const isLocked = ["APROBADO", "CERRADO"].includes(currentEstado) ||
    (currentEstado === "EN_REVISION" && !cap.approve);
  const progressPct = totalItems > 0 ? Math.round((totalEval / totalItems) * 100) : 0;
  const progressTone = progressPct < 33 ? "#c0392b" : progressPct < 66 ? "#e67e22" : "#27862f";

  function getStepStatus(tab: TabKey): "active" | "done" | "pending" {
    if (tab === activeTab) return "active";
    const ejeIdx = ["priv", "sec", "risk"].indexOf(tab);
    if (ejeIdx !== -1) {
      const s = stats[ejeIdx];
      if (s.evaluated > 0) return "done";
    }
    if (tab === "datos") {
      return Object.values(form).some((v) => v.trim()) ? "done" : "pending";
    }
    if (tab === "plan") return plan.some((r) => r.hallazgo?.trim()) ? "done" : "pending";
    return "pending";
  }

  function goToTab(tab: TabKey) { setActiveTab(tab); window.scrollTo(0, 0); }
  function goNext() { if (currentTabIdx < TABS.length - 1) goToTab(TABS[currentTabIdx + 1]); }
  function goPrev() { if (currentTabIdx > 0) goToTab(TABS[currentTabIdx - 1]); }

  return (
    <section className="wizard-experience">
      {/* ── HEADER ── */}
      <header className="panel wizard-page-header">
        <div className="wizard-title-block">
          <button
            type="button"
            onClick={() => navigate("/checklist-dpd")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand)", fontWeight: 600, fontSize: 13, padding: 0, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}
          >
            ← Volver a Diseño Defecto
          </button>
          <span className="brand-kicker">Privacidad · LOPDP · {doc?.codigo ?? "…"}</span>
          <h2>Diseño Defecto</h2>
          <div className="wizard-context-row">
            <span>Codigo <strong style={{ fontFamily: "monospace" }}>{doc?.codigo ?? "—"}</strong></span>
            <span>{totalEval} / {totalItems} controles evaluados</span>
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
              onClick={() => void saveMutation.mutateAsync({ id: docIdRef.current!, payload: { controles: state, planRows: plan, formData: form, estado: "APROBADO" } })}
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
              onClick={() => void saveMutation.mutateAsync({ id: docIdRef.current!, payload: { estado: "DEVUELTO" } })}
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
          {cap.create && !isNew && (
            <button
              type="button"
              className="button-primary"
              onClick={() => navigate('/checklist-dpd/new')}
            >
              + Nuevo Diseño Defecto
            </button>
          )}
        </div>
      </header>

      {/* ── OVERVIEW ── */}
      <section className="panel wizard-overview">
        <div className="wizard-overview-row">
          <div>
            <span className="wizard-overview-label">Progreso de la evaluacion</span>
            <p>Evalúe todos los controles aplicables para obtener el diagnóstico de madurez.</p>
          </div>
          <strong className="wizard-progress-value">{progressPct}%</strong>
        </div>
        <div className="progress-bar wizard-progress-bar" style={{ ["--wizard-progress-tone" as string]: progressTone }}>
          <span style={{ width: `${progressPct}%` }} />
        </div>
      </section>

      {/* ── LAYOUT: RAIL + MAIN ── */}
      <div className="wizard-layout wizard-layout-refined">

        {/* ── SIDEBAR RAIL ── */}
        <aside className="panel wizard-rail">
          <div className="wizard-rail-header">
            <span className="brand-kicker">Secciones</span>
          </div>
          {TABS.map((tab, index) => {
            const status = getStepStatus(tab);
            const ejeIdx = ["priv", "sec", "risk"].indexOf(tab);
            const prog = ejeIdx !== -1 ? tabProgress(tab as EjeKey, ejeIdx) : null;
            return (
              <button
                key={tab}
                type="button"
                className={`wizard-step-card wizard-step-card-${status}`}
                onClick={() => goToTab(tab)}
              >
                <span className="wizard-step-index">{index + 1}</span>
                <span className="wizard-step-copy">
                  <strong>{TAB_TITLES[tab]}</strong>
                  <small>
                    {prog ? `${prog.count} controles` : status === "done" ? "Completado" : status === "active" ? "En edicion" : "Pendiente"}
                  </small>
                </span>
              </button>
            );
          })}
        </aside>

        {/* ── MAIN CONTENT ── */}
        <div className="wizard-main">
          <section className="panel wizard-stage">
            <div className="wizard-stage-header">
              <div>
                <h3>{TAB_TITLES[activeTab]}</h3>
                <p>{TAB_HELP[activeTab]}</p>
              </div>
            </div>

            {/* ── DATOS GENERALES ── */}
            {activeTab === "datos" && (
              <div>
                <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "20px" }}>
                  <div className="ckl-form-grid">
                    {(["proceso", "responsable", "dependencia", "periodo", "version", "codigo"] as (keyof FormData)[]).map((key) => (
                      <label key={key} className="ckl-field">
                        <span>{key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}</span>
                        <input type="text" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={`Ingrese ${key}`} />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── EJE TABLES ── */}
            {EJES.map((eje, ejeIdx) => activeTab === eje.key && (
              <div key={eje.key}>
                <div className="ckl-legend">
                  {[{ n: "0", lbl: "Caótico", desc: "No implementado. Riesgo crítico.", cls: "ml0" }, { n: "1", lbl: "Implícito", desc: "< 25% implementado. Riesgo alto.", cls: "ml1" }, { n: "2", lbl: "Temprano", desc: "25–75% implementado. Riesgo medio.", cls: "ml2" }, { n: "3", lbl: "Maduro", desc: "> 75% con evidencias. Riesgo bajo.", cls: "ml3" }, { n: "N/A", lbl: "No aplica", desc: "Excluido del promedio.", cls: "mlna" }].map((leg) => (
                    <div key={leg.n} className={`ckl-legend-item ${leg.cls}`}>
                      <div className="ckl-legend-num">{leg.n}</div>
                      <div className="ckl-legend-lbl">{leg.lbl}</div>
                      <div className="ckl-legend-desc">{leg.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                  <button type="button" className="button-ghost" style={{ fontSize: 12 }} onClick={() => markAllNA(eje.key)}>Marcar eje como N/A</button>
                </div>
                <div className="ckl-table-wrap">
                  <table className="ckl-table">
                    <thead>
                      <tr>
                        <th className="col-num">#</th>
                        <th className="col-principio">Principio</th>
                        <th className="col-tactica">Tactica</th>
                        <th className="col-pregunta">Pregunta de control</th>
                        <th style={{ minWidth: 160 }}>Nivel de madurez</th>
                        <th style={{ minWidth: 140 }}>Evidencia / registro</th>
                        <th className="col-accion">Accion recomendada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eje.data.map((item, idx) => {
                        const s = state[eje.key][idx];
                        return (
                          <tr key={item.id} className={rowClass(s.nivel)}>
                            <td className="col-num">{item.id}</td>
                            <td className="col-principio">{item.principio}</td>
                            <td className="col-tactica">{item.tactica}</td>
                            <td className="col-pregunta">{item.pregunta}</td>
                            <td>
                              <div className="nivel-selector" role="radiogroup">
                                {NIV_LABELS.map((n) => (
                                  <button key={String(n)} type="button" className={nivelBtnClass(n, s.nivel)} title={`Nivel ${n}`} onClick={() => setNivel(eje.key, idx, n)}>
                                    {n === "na" ? "N/A" : String(n)}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="col-evidencia">
                              <input type="text" placeholder="Documento / registro / fecha…" value={s.evidencia} onChange={(e) => setEvidencia(eje.key, idx, e.target.value)} />
                            </td>
                            <td className="col-accion">
                              {item.accion}
                              {(s.nivel === 0 || s.nivel === 1) && <div className="accion-flag">Nivel bajo el objetivo — aplicar esta accion</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* ── RESUMEN GAP ── */}
            {activeTab === "resumen" && (
              <div>
                <div className="ckl-gap-grid">
                  {EJES.map((eje, i) => {
                    const s = stats[i];
                    const avg = s.allNA ? null : s.avg;
                    const riesgo = s.allNA ? "N/A" : riesgoLabel(avg);
                    return (
                      <div key={eje.key} className="ckl-gap-card">
                        <h4>{eje.label}</h4>
                        <div className="ckl-gap-stat">{s.allNA ? "N/A" : avg !== null ? avg.toFixed(2) : "—"}</div>
                        <div className="ckl-gap-label">Promedio actual / 3.00 · Brecha: {s.allNA ? "—" : s.brecha !== null ? s.brecha.toFixed(2) : "—"}</div>
                        <div className="ckl-bar-wrap"><div className="ckl-bar" style={{ width: avg !== null ? `${(avg / 3) * 100}%` : "0%", background: barColor(avg) }} /></div>
                        {riesgo !== "N/A" && avg !== null && <span className={`ckl-risk-pill risk-${riesgo}`}>{riesgo}</span>}
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>{s.evaluated}/{s.total} evaluados</div>
                      </div>
                    );
                  })}
                </div>

                <div className="ckl-global">
                  <div>
                    <div className="ckl-global-num">{globalAvg !== null ? globalAvg.toFixed(2) : "—"}</div>
                    <div className="ckl-global-of">/ 3.00 — Madurez global</div>
                  </div>
                  <div className="ckl-global-body">
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: "var(--muted)", marginBottom: 4 }}>
                      <span>0 — Crítico</span><span>1 — Alto</span><span>2 — Medio</span><span>3 — Bajo</span>
                    </div>
                    <div className="ckl-bar-wrap" style={{ height: 12 }}>
                      <div className="ckl-bar" style={{ width: globalAvg !== null ? `${(globalAvg / 3) * 100}%` : "0%", background: barColor(globalAvg) }} />
                    </div>
                  </div>
                </div>

                <PrepBox avg={globalAvg} evaluated={totalEval} total={totalItems} />

              </div>
            )}

            {/* ── PLAN DE ACCION ── */}
            {activeTab === "plan" && (
              <div>
                <div className="ckl-hint">Todo hallazgo con nivel inferior al objetivo (3) requiere accion, responsable, prioridad, fechas y estado de seguimiento.</div>
                <div style={{ overflowX: "auto" }}>
                  <table className="ckl-plan-table">
                    <thead>
                      <tr>
                        <th style={{ width: 32 }}>#</th>
                        <th style={{ width: 110 }}>Eje</th>
                        <th>Hallazgo</th>
                        <th>Accion correctiva</th>
                        <th style={{ width: 120 }}>Responsable</th>
                        <th style={{ width: 80 }}>Prioridad</th>
                        <th style={{ width: 100 }}>Inicio</th>
                        <th style={{ width: 100 }}>Limite</th>
                        <th style={{ width: 90 }}>Estado</th>
                        <th style={{ width: 36 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.map((row, idx) => (
                        <tr key={idx}>
                          <td style={{ textAlign: "center", fontWeight: 700, color: "var(--muted)" }}>{idx + 1}</td>
                          <td>
                            <select value={row.eje ?? ""} onChange={(e) => setPlan((p) => p.map((r, i) => i === idx ? { ...r, eje: e.target.value } : r))}>
                              <option value=""></option>
                              <option>DevPrivOps</option><option>DevSecOps</option><option>DevRiskOps</option>
                            </select>
                          </td>
                          {(["hallazgo", "accion", "responsable"] as const).map((fk) => (
                            <td key={fk}><input type="text" value={row[fk] ?? ""} onChange={(e) => setPlan((p) => p.map((r, i) => i === idx ? { ...r, [fk]: e.target.value } : r))} /></td>
                          ))}
                          <td>
                            <select value={row.prioridad ?? ""} onChange={(e) => setPlan((p) => p.map((r, i) => i === idx ? { ...r, prioridad: e.target.value } : r))}>
                              <option value=""></option><option>Alta</option><option>Media</option><option>Baja</option>
                            </select>
                          </td>
                          {(["fechaIni", "fechaLim"] as const).map((fk) => (
                            <td key={fk}><input type="date" value={row[fk] ?? ""} onChange={(e) => setPlan((p) => p.map((r, i) => i === idx ? { ...r, [fk]: e.target.value } : r))} /></td>
                          ))}
                          <td>
                            <select value={row.estado ?? ""} onChange={(e) => setPlan((p) => p.map((r, i) => i === idx ? { ...r, estado: e.target.value } : r))}>
                              <option value=""></option><option>Abierto</option><option>En progreso</option><option>Cerrado</option>
                            </select>
                          </td>
                          <td>
                            <button type="button" className="ckl-del-btn" onClick={() => setPlan((p) => p.filter((_, i) => i !== idx))}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button type="button" className="ckl-add-btn" onClick={() => setPlan((p) => [...p, {}])}>+ Agregar fila</button>
              </div>
            )}
          </section>

          {/* ── ACTION BAR ── */}
          <div className="wizard-action-bar">
            <button type="button" className="button-secondary" onClick={() => navigate("/checklist-dpd")}>
              Cancelar
            </button>
            <div className="wizard-footer-actions">
              <button
                type="button"
                className="button-secondary"
                disabled={currentTabIdx === 0}
                onClick={goPrev}
              >
                Anterior
              </button>
              <button
                type="button"
                className="button-secondary"
                disabled={currentTabIdx === TABS.length - 1}
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
                onClick={() => void saveMutation.mutateAsync({ id: docIdRef.current!, payload: { controles: state, planRows: plan, formData: form, estado: "APROBADO" } })}
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
                onClick={() => void saveMutation.mutateAsync({ id: docIdRef.current!, payload: { estado: "DEVUELTO" } })}
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
                Cerrar checklist
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
    </section>
  );
}

function PrepBox({ avg, evaluated, total }: { avg: number | null; evaluated: number; total: number }) {
  const complete = evaluated === total;
  if (avg === null) return <div className="ckl-prep prep-partial">Complete la evaluacion para obtener el diagnostico de preparacion.</div>;
  if (!complete) return <div className="ckl-prep prep-partial">Evaluacion en curso ({evaluated}/{total}). El diagnostico requiere calificar todos los controles aplicables.</div>;
  if (avg >= 2.5) return <div className="ckl-prep prep-ready">PREPARADO — El proceso presenta madurez adecuada. Conserve el expediente de evidencias listo ante requerimientos de la SPDP.</div>;
  if (avg >= 1.5) return <div className="ckl-prep prep-partial">PARCIALMENTE PREPARADO — Existen brechas que generarian observaciones. Ejecute el plan de accion y reevalue antes del cierre del periodo.</div>;
  if (avg >= 0.75) return <div className="ckl-prep prep-notready">NO PREPARADO — Brechas significativas con alto riesgo de hallazgos mayores ante la SPDP. Priorice los controles en nivel 0 y 1.</div>;
  return <div className="ckl-prep prep-critical">CRITICO — El proceso no esta preparado para una revision de la SPDP. Active un programa integral de remediacion de inmediato.</div>;
}
