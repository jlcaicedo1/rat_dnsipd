import iessLogoUrl from "../../assets/iess-logo-color.png";
import type { ReactNode, Ref } from "react";
import type {
  ActivityRegistryRecord,
  SignatureFieldState,
  TreatmentReport,
} from "./rat-registry-data";

// ─── types ────────────────────────────────────────────────────────────────────

type TreatmentReportPreviewProps = {
  report: TreatmentReport;
  signatures: SignatureFieldState;
  activity?: ActivityRegistryRecord;
  onSignatureChange?: (field: keyof SignatureFieldState, value: string) => void;
  onPrint?: () => void;
  heading?: string;
  readOnly?: boolean;
  showToolbar?: boolean;
  toolbarActions?: ReactNode;
  surfaceRef?: Ref<HTMLDivElement>;
};

type ReportValue = string | number | boolean | null | undefined;
type RptRow = { label: string; value: ReportValue };

// ─── React component (screen preview) ────────────────────────────────────────

export function TreatmentReportPreview({
  report,
  signatures,
  activity,
  onSignatureChange,
  onPrint,
  heading = "Registro de Actividad de Tratamiento",
  readOnly = false,
  showToolbar = true,
  toolbarActions,
  surfaceRef,
}: TreatmentReportPreviewProps) {
  const logoSrc = resolveLogoSrc();

  const activityName = activity?.nombre ?? report.nombreTratamiento;
  const activityCode = activity?.codigo ?? "No documentado";
  const responsibleDependency = activity?.dependencia ?? report.dependenciaResponsable;
  const executingDependency =
    activity?.unidadEjecutora ?? report.dependenciaEjecutora ?? report.subproceso;
  const version = activity?.version ?? "—";
  const status = activity?.estado ?? report.estado;
  const riskLevel = activity?.riesgo ?? report.nivelRiesgo;
  const lastUpdate = activity?.fechaActualizacion ?? report.ultimaActualizacion;
  const eipdRequired = activity?.requiereEipd ?? report.requiereEipd;

  const today = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return (
    <section className="report-preview-shell">
      {showToolbar ? (
        <div className="report-preview-toolbar">
          <div className="report-preview-toolbar-copy">
            <span className="brand-kicker">Vista previa formalizable</span>
            <h3>{heading}</h3>
            <p className="page-copy">
              Documento imprimible con trazabilidad y espacios de firma electrónica.
            </p>
          </div>
          <div className="report-preview-toolbar-actions">
            {toolbarActions}
            {!toolbarActions && onPrint ? (
              <button type="button" className="button-secondary" onClick={onPrint}>
                Imprimir / guardar PDF
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="report-print-surface" ref={surfaceRef}>
        <article className="report-sheet">

          {/* ── MEMBRETE INSTITUCIONAL ── */}
          <div className="report-letterhead">
            <div className="report-letterhead-logo">
              <img src={logoSrc} alt="IESS" className="report-letterhead-img" />
            </div>
            <div className="report-letterhead-center">
              <strong className="report-letterhead-institution">
                INSTITUTO ECUATORIANO DE SEGURIDAD SOCIAL
              </strong>
              <span className="report-letterhead-dept">
                Dirección Nacional de Servicios Institucionales de Protección de Datos Personales
              </span>
              <span className="report-letterhead-sys">
                Sistema RAT — Registro de Actividades de Tratamiento
              </span>
            </div>
            <div className="report-letterhead-ref">
              <span className="report-letterhead-doctype">RAT</span>
              <div className="report-letterhead-code">{activityCode}</div>
              <div className="report-letterhead-ver">Versión {version}</div>
            </div>
          </div>

          {/* ── BANNER DEL DOCUMENTO ── */}
          <div className="report-doc-banner">
            REGISTRO DE ACTIVIDAD DE TRATAMIENTO DE DATOS PERSONALES
          </div>

          {/* ── FRANJA DE METADATOS ── */}
          <div className="report-meta-strip">
            <div className="report-meta-item report-meta-item-wide">
              <span className="report-meta-label">Actividad</span>
              <span className="report-meta-val">{activityName}</span>
            </div>
            <div className="report-meta-item report-meta-item-wide">
              <span className="report-meta-label">Dependencia responsable</span>
              <span className="report-meta-val">{responsibleDependency}</span>
            </div>
            <div className="report-meta-item">
              <span className="report-meta-label">Estado</span>
              <span className="report-meta-val">{fmtVal(status)}</span>
            </div>
            <div className="report-meta-item">
              <span className="report-meta-label">Versión</span>
              <span className="report-meta-val">{version}</span>
            </div>
            <div className="report-meta-item">
              <span className="report-meta-label">Levantamiento</span>
              <span className="report-meta-val">{report.fechaCreacion}</span>
            </div>
          </div>

          {/* ── SECCIONES DE CONTENIDO ── */}
          <div className="report-sections">

            <ReportSection title="1. Información general">
              <ReportFieldTable
                rows={[
                  { label: "Código RAT", value: report.codigoRat },
                  { label: "Código de actividad", value: activityCode },
                  { label: "Nombre de la actividad", value: activityName },
                  { label: "Dependencia responsable", value: responsibleDependency },
                  { label: "Dependencia ejecutora / Unidad", value: executingDependency },
                  { label: "Proceso relacionado", value: report.procesoRelacionado },
                  { label: "Subproceso", value: report.subproceso },
                  { label: "Fecha de levantamiento", value: report.fechaCreacion },
                  { label: "Última actualización", value: lastUpdate },
                ]}
              />
            </ReportSection>

            <ReportSection title="2. Finalidad y base de licitud">
              <ReportFieldTable
                rows={[
                  { label: "Finalidad específica", value: report.finalidadEspecifica },
                  { label: "Base de licitud", value: report.baseLicitud },
                  { label: "Norma aplicable", value: report.normaAplicable },
                ]}
              />
            </ReportSection>

            <ReportSection title="3. Titulares y categorías de datos personales">
              <ReportFieldTable
                rows={[
                  { label: "Tipos de titulares", value: report.titulares },
                  { label: "Categorías de datos personales", value: report.categoriasDatos },
                  { label: "Datos sensibles", value: report.datosSensibles },
                  { label: "Datos de niños, niñas y adolescentes", value: report.datosNna },
                ]}
              />
            </ReportSection>

            <ReportSection title="4. Activos de información asociados">
              <ReportFieldTable
                rows={[
                  {
                    label: "Activo electrónico",
                    value: report.activoElectronico ?? report.activosInformacionAsociados,
                  },
                  { label: "Activo físico", value: report.activoFisico },
                  { label: "Tipo del activo", value: report.tipoActivo },
                  { label: "Base de datos / Repositorio", value: report.baseDatosRepositorio },
                ]}
              />
            </ReportSection>

            <ReportSection title="5. Operación del tratamiento">
              <ReportFieldTable
                rows={[
                  { label: "Origen de los datos", value: report.origenDatos },
                  { label: "Medios de recolección", value: report.mediosRecoleccion },
                  { label: "Acciones del tratamiento", value: report.accionesTratamiento },
                ]}
              />
            </ReportSection>

            <ReportSection title="6. Destinatarios y transferencias">
              <ReportFieldTable
                rows={[
                  { label: "Destinatarios internos", value: report.destinatariosInternos },
                  { label: "Destinatarios externos", value: report.destinatariosExternos },
                  {
                    label: "Transferencias internacionales",
                    value: report.transferenciasInternacionales,
                  },
                  { label: "País destino", value: report.paisDestino },
                  { label: "Mecanismo de transferencia", value: report.mecanismoTransferencia },
                ]}
              />
            </ReportSection>

            <ReportSection title="7. Conservación y supresión">
              <ReportFieldTable
                rows={[
                  { label: "Plazo de conservación", value: report.plazoConservacion },
                  { label: "Criterios de conservación", value: report.criteriosConservacion },
                  { label: "Supresión / Anonimización", value: report.supresionAnonimizacion },
                ]}
              />
            </ReportSection>

            <ReportSection title="8. Medidas de seguridad">
              <ReportFieldTable
                rows={[{ label: "Controles aplicados", value: report.medidasSeguridad }]}
              />
            </ReportSection>

            <ReportSection title="9. Nivel de riesgo y evaluación EIPD">
              <ReportFieldTable
                rows={[
                  { label: "Nivel de riesgo", value: riskLevel },
                  { label: "Requiere EIPD", value: eipdRequired },
                ]}
              />
            </ReportSection>

          </div>

          {/* ── SECCIÓN DE FIRMAS ── */}
          <div className="report-sig-wrap">
            <div className="report-sig-banner">
              10. Formalización — Firmas de Aprobación
            </div>
            <div className="report-sig-grid">
              <SignatureBlock
                role="ELABORADO POR"
                roleClass="elaborado"
                subLabel="Propietario / Levantamiento"
                name={signatures.elaboradoPorNombre}
                cargo={signatures.elaboradoPorCargo}
                nameField="elaboradoPorNombre"
                cargoField="elaboradoPorCargo"
                onSignatureChange={onSignatureChange}
                readOnly={readOnly}
              />
              <SignatureBlock
                role="REVISADO POR"
                roleClass="revisado"
                subLabel="Asesoría DPD / Revisor"
                name={signatures.revisadoPorNombre}
                cargo={signatures.revisadoPorCargo}
                nameField="revisadoPorNombre"
                cargoField="revisadoPorCargo"
                onSignatureChange={onSignatureChange}
                readOnly={readOnly}
              />
              <SignatureBlock
                role="AUTORIDAD"
                roleClass="autoridad"
                subLabel="Autoridad de la dependencia"
                name={signatures.autoridadNombre}
                cargo={signatures.autoridadCargo}
                nameField="autoridadNombre"
                cargoField="autoridadCargo"
                onSignatureChange={onSignatureChange}
                readOnly={readOnly}
              />
            </div>
          </div>

          {/* ── PIE DE PÁGINA ── */}
          <div className="report-doc-footer">
            <span>IESS — Sistema RAT | Documento institucional reservado</span>
            <span>Generado: {today}</span>
          </div>

        </article>
      </div>
    </section>
  );
}

// ─── React sub-components ────────────────────────────────────────────────────

function ReportSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="report-section">
      <div className="report-section-title">{title}</div>
      {children}
    </section>
  );
}

function ReportFieldTable({ rows }: { rows: RptRow[] }) {
  return (
    <table className="report-field-table">
      <tbody>
        {rows.map((row) => {
          const formattedValue = fmtVal(row.value);
          const isEmpty = formattedValue === "No documentado";
          return (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td className={isEmpty ? "report-empty-value" : undefined}>
                {isEmpty ? formattedValue : <RptCell text={formattedValue} />}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function RptCell({ text }: { text: string }) {
  const parts = text
    .split(/\s*[;\n]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return (
      <ul className="report-field-list">
        {parts.map((part, i) => (
          <li key={i}>{part}</li>
        ))}
      </ul>
    );
  }
  return <>{text}</>;
}

function SignatureBlock({
  role,
  roleClass,
  subLabel,
  name,
  cargo,
  nameField,
  cargoField,
  onSignatureChange,
  readOnly,
}: {
  role: string;
  roleClass: "elaborado" | "revisado" | "autoridad";
  subLabel: string;
  name: string;
  cargo: string;
  nameField: keyof SignatureFieldState;
  cargoField: keyof SignatureFieldState;
  onSignatureChange?: (field: keyof SignatureFieldState, value: string) => void;
  readOnly: boolean;
}) {
  const isEmpty = !name.trim();
  return (
    <div className="report-sig-block">
      <div className={`report-sig-role report-sig-role-${roleClass}`}>{role}</div>
      <div className="report-sig-sublabel">{subLabel}</div>
      <div className="report-sig-body">
        <div className="report-sig-field">
          <div className="report-sig-field-label">Nombre completo</div>
          {readOnly ? (
            <div
              className={`report-sig-field-value${isEmpty ? " report-sig-field-value-empty" : ""}`}
            >
              {name.trim() || "___________________________________"}
            </div>
          ) : (
            <input
              className="input"
              value={name}
              placeholder="Nombre completo"
              onChange={(e) => onSignatureChange?.(nameField, e.target.value)}
            />
          )}
        </div>
        <div className="report-sig-field">
          <div className="report-sig-field-label">Cargo / Función</div>
          {readOnly ? (
            <div className="report-sig-field-value report-sig-field-value-muted">
              {cargo || "___________________________________"}
            </div>
          ) : (
            <input
              className="input"
              value={cargo}
              placeholder="Cargo o función"
              onChange={(e) => onSignatureChange?.(cargoField, e.target.value)}
            />
          )}
        </div>
        <div className="report-sig-draw">
          <div className="report-sig-draw-text">
            Firma electrónica certificada
            <br />
            <small>Adjunte imagen, QR o referencia del gestor documental</small>
          </div>
        </div>
      </div>
      <div className="report-sig-footer">
        <div className="report-sig-date-row">
          <span className="report-sig-date-label">Fecha:</span>
          <span className="report-sig-date-line" />
        </div>
        <div className="report-sig-ref-row">
          <span className="report-sig-ref-label">Ref. firma electrónica:</span>
          <span className="report-sig-ref-line" />
        </div>
      </div>
    </div>
  );
}

// ─── shared utilities ─────────────────────────────────────────────────────────

function resolveLogoSrc(): string {
  if (typeof window === "undefined") return iessLogoUrl as string;
  if (String(iessLogoUrl).startsWith("http")) return iessLogoUrl as string;
  return `${window.location.origin}${iessLogoUrl as string}`;
}

function fmtVal(value: ReportValue): string {
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (value === null || value === undefined) return "No documentado";
  const text = String(value).trim();
  return text.length > 0 ? text : "No documentado";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── HTML generation helpers (for standalone print document) ─────────────────

function cellHtml(text: string): string {
  const parts = text
    .split(/\s*[;\n]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return `<ul class="report-field-list">${parts.map((p) => `<li>${escapeHtml(p)}</li>`).join("")}</ul>`;
  }
  return escapeHtml(text);
}

function rowHtml(label: string, value: ReportValue): string {
  const formatted = fmtVal(value);
  const isEmpty = formatted === "No documentado";
  return `<tr>
      <th scope="row">${label}</th>
      <td${isEmpty ? ' class="report-empty-value"' : ""}>${isEmpty ? escapeHtml(formatted) : cellHtml(formatted)}</td>
    </tr>`;
}

function sectionHtml(
  num: number,
  title: string,
  rows: Array<{ label: string; value: ReportValue }>,
): string {
  return `<section class="report-section">
    <div class="report-section-title">${num}. ${title}</div>
    <table class="report-field-table">
      <tbody>
        ${rows.map((r) => rowHtml(r.label, r.value)).join("\n        ")}
      </tbody>
    </table>
  </section>`;
}

function sigBlockHtml(
  role: string,
  roleClass: string,
  subLabel: string,
  name: string,
  cargo: string,
): string {
  const isEmpty = !name.trim();
  return `<div class="report-sig-block">
    <div class="report-sig-role report-sig-role-${roleClass}">${role}</div>
    <div class="report-sig-sublabel">${subLabel}</div>
    <div class="report-sig-body">
      <div class="report-sig-field">
        <div class="report-sig-field-label">Nombre completo</div>
        <div class="report-sig-field-value${isEmpty ? " report-sig-field-value-empty" : ""}">${escapeHtml(name.trim() || "___________________________________")}</div>
      </div>
      <div class="report-sig-field">
        <div class="report-sig-field-label">Cargo / Función</div>
        <div class="report-sig-field-value report-sig-field-value-muted">${escapeHtml(cargo || "___________________________________")}</div>
      </div>
      <div class="report-sig-draw">
        <div class="report-sig-draw-text">
          Firma electrónica certificada<br>
          <small>Adjunte imagen, QR o referencia del gestor documental</small>
        </div>
      </div>
    </div>
    <div class="report-sig-footer">
      <div class="report-sig-date-row">
        <span class="report-sig-date-label">Fecha:</span>
        <span class="report-sig-date-line"></span>
      </div>
      <div class="report-sig-ref-row">
        <span class="report-sig-ref-label">Ref. firma electrónica:</span>
        <span class="report-sig-ref-line"></span>
      </div>
    </div>
  </div>`;
}

// ─── print CSS (embedded in generated HTML document) ─────────────────────────

const reportPrintStyles = `
  :root { color-scheme: light; }
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── PAGE LAYOUT ── */
  @page {
    size: A4 portrait;
    margin: 20mm 15mm 18mm 15mm;

    /* Running header — pages 2 onwards */
    @top-left {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      content: "INSTITUTO ECUATORIANO DE SEGURIDAD SOCIAL";
      font-size: 7pt; font-weight: 700; color: #1a3a5c;
      border-bottom: 0.5pt solid #1a3a5c;
      padding-bottom: 4pt; vertical-align: bottom;
    }
    @top-right {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      content: "Registro de Actividad de Tratamiento";
      font-size: 7pt; color: #6b8099;
      border-bottom: 0.5pt solid #1a3a5c;
      padding-bottom: 4pt; vertical-align: bottom; text-align: right;
    }

    /* Footer — all pages */
    @bottom-left {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      content: "IESS \\00b7 Sistema RAT \\2014 Documento Institucional Reservado";
      font-size: 7pt; color: #6b8099;
      border-top: 0.5pt solid #cdd9e8;
      padding-top: 4pt; vertical-align: top;
    }
    @bottom-right {
      font-family: "Segoe UI", Arial, Helvetica, sans-serif;
      content: "P\\00e1gina " counter(page) " de " counter(pages);
      font-size: 8pt; font-weight: 700; color: #1a3a5c;
      border-top: 0.5pt solid #cdd9e8;
      padding-top: 4pt; vertical-align: top; text-align: right;
    }
  }

  /* First page: letterhead handles the header — suppress margin-box header */
  @page :first {
    margin-top: 12mm;
    @top-left  { content: ""; border: none; padding: 0; }
    @top-right { content: ""; border: none; padding: 0; }
  }

  /* ── BODY ── */
  body {
    margin: 0; padding: 0;
    background: #ffffff;
    color: #0e1f33;
    font-family: "Segoe UI", Arial, Helvetica, sans-serif;
    font-size: 9pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    orphans: 3; widows: 3;
  }

  /* ── SHEET ── */
  .report-sheet { background: #fff; }

  /* ── LETTERHEAD ── */
  .report-letterhead {
    display: flex; align-items: center; gap: 12px;
    padding-bottom: 10px;
    border-bottom: 3px solid #1a3a5c;
  }
  .report-letterhead-logo { flex-shrink: 0; }
  .report-letterhead-img { height: 52px; width: auto; display: block; }
  .report-letterhead-center { flex: 1; min-width: 0; }
  .report-letterhead-institution {
    display: block; font-size: 10.5pt; font-weight: 800;
    color: #1a3a5c; line-height: 1.2;
  }
  .report-letterhead-dept {
    display: block; font-size: 8pt; color: #2c4a66;
    margin-top: 3px; line-height: 1.3;
  }
  .report-letterhead-sys {
    display: block; font-size: 7pt; color: #5a7890; margin-top: 2px;
  }
  .report-letterhead-ref { text-align: right; flex-shrink: 0; min-width: 100px; }
  .report-letterhead-doctype {
    display: inline-block; background: #1a3a5c; color: #fff;
    font-size: 7.5pt; font-weight: 800; letter-spacing: 0.14em;
    padding: 3px 9px; border-radius: 3px;
  }
  .report-letterhead-code {
    font-size: 8.5pt; color: #1a3a5c; font-weight: 700; margin-top: 4px;
  }
  .report-letterhead-ver { font-size: 7.5pt; color: #6b8099; margin-top: 2px; }

  /* ── BANNER ── */
  .report-doc-banner {
    background: #1a3a5c; color: #fff;
    text-align: center; font-size: 9.5pt; font-weight: 800;
    letter-spacing: 0.05em; padding: 8px 16px; text-transform: uppercase;
  }

  /* ── META STRIP ── */
  .report-meta-strip {
    display: flex; border: 1px solid #cdd9e8; border-top: 0;
    background: #f4f7fb; font-size: 7.5pt;
  }
  .report-meta-item {
    display: flex; flex-direction: column; gap: 1px;
    padding: 6px 10px; border-right: 1px solid #cdd9e8;
    flex: 1; min-width: 0;
  }
  .report-meta-item-wide { flex: 2; }
  .report-meta-item:last-child { border-right: 0; }
  .report-meta-label {
    font-weight: 700; color: #3d5c77;
    font-size: 6.5pt; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .report-meta-val { color: #0e1f33; overflow-wrap: anywhere; line-height: 1.3; }

  /* ── CONTENT SECTIONS ── */
  .report-sections { display: grid; gap: 6px; margin-top: 8px; }
  .report-section {
    border: 1px solid #cdd9e8; overflow: hidden;
    break-inside: avoid; page-break-inside: avoid;
  }
  .report-section-title {
    background: #eaf0f8; color: #1a3a5c;
    font-size: 7pt; font-weight: 800;
    padding: 6px 10px 6px 12px;
    text-transform: uppercase; letter-spacing: 0.07em;
    border-left: 4px solid #1a3a5c; text-align: left;
    break-after: avoid; page-break-after: avoid;
  }

  /* ── FIELD TABLE ── */
  .report-field-table {
    border-collapse: collapse; width: 100%; font-size: 8.5pt;
  }
  .report-field-table th,
  .report-field-table td {
    border-top: 1px solid #e8eef5;
    padding: 5px 10px; vertical-align: top; line-height: 1.5;
  }
  .report-field-table tr:first-child th,
  .report-field-table tr:first-child td { border-top: 0; }
  .report-field-table tr {
    break-inside: avoid; page-break-inside: avoid;
  }
  .report-field-table tr:nth-child(even) td,
  .report-field-table tr:nth-child(even) th { background: #f8fbfd; }
  .report-field-table th {
    color: #1a3a5c; font-size: 7.5pt; font-weight: 700;
    text-align: left; width: 30%;
    padding-right: 10px; border-right: 2px solid #dce8f2;
    background: #f4f7fb;
  }
  .report-field-table td { color: #0e1f33; overflow-wrap: anywhere; }
  .report-empty-value { color: #94a3b8; font-style: italic; }
  .report-field-list { margin: 0; padding: 0 0 0 14px; line-height: 1.55; }
  .report-field-list li { margin-bottom: 1px; }

  /* ── SIGNATURE SECTION ── */
  .report-sig-wrap {
    margin-top: 10px; border: 1px solid #cdd9e8;
    break-inside: avoid; page-break-inside: avoid;
  }
  .report-sig-banner {
    background: #1a3a5c; color: #fff;
    font-size: 7.5pt; font-weight: 800;
    padding: 7px 12px 7px 16px;
    text-transform: uppercase; letter-spacing: 0.06em;
    border-left: 4px solid #c8a420; text-align: left;
  }
  .report-sig-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
  .report-sig-block {
    border-right: 1px solid #cdd9e8;
    display: flex; flex-direction: column;
  }
  .report-sig-block:last-child { border-right: 0; }
  .report-sig-role {
    text-align: left; font-size: 7pt; font-weight: 800;
    letter-spacing: 0.08em; text-transform: uppercase; padding: 7px 10px;
  }
  .report-sig-role-elaborado { background: #1e4d7b; color: #fff; }
  .report-sig-role-revisado  { background: #0f6fae; color: #fff; }
  .report-sig-role-autoridad { background: #25578a; color: #fff; }
  .report-sig-sublabel {
    font-size: 6.5pt; color: #3d5c77; text-align: left;
    padding: 4px 10px; background: #eef3f9;
    border-bottom: 1px solid #cdd9e8;
  }
  .report-sig-body {
    padding: 9px 10px; flex: 1;
    display: flex; flex-direction: column; gap: 7px;
  }
  .report-sig-field { display: grid; gap: 2px; }
  .report-sig-field-label {
    font-size: 6.5pt; font-weight: 700; color: #3d5c77;
    text-transform: uppercase; letter-spacing: 0.05em;
  }
  .report-sig-field-value {
    font-size: 8.5pt; color: #0e1f33; min-height: 17px;
    border-bottom: 1px solid #b0c4d8; padding-bottom: 2px;
    overflow-wrap: anywhere;
  }
  .report-sig-field-value-muted { color: #5a7890; }
  .report-sig-field-value-empty { color: #94a3b8; font-style: italic; }
  .report-sig-draw {
    border: 1px dashed #b0c4d8; height: 52px; margin-top: 5px;
    display: flex; align-items: center; justify-content: center;
    background: #fafcff;
  }
  .report-sig-draw-text {
    font-size: 7pt; color: #94a3b8; text-align: center; line-height: 1.3;
  }
  .report-sig-draw-text small { font-size: 6.5pt; }
  .report-sig-footer {
    background: #f4f7fb; border-top: 1px solid #cdd9e8;
    padding: 7px 10px; display: grid; gap: 4px;
  }
  .report-sig-date-row,
  .report-sig-ref-row { display: flex; align-items: flex-end; gap: 5px; }
  .report-sig-date-label,
  .report-sig-ref-label {
    font-size: 7pt; color: #3d5c77; font-weight: 600;
    white-space: nowrap; flex-shrink: 0;
  }
  .report-sig-date-line,
  .report-sig-ref-line {
    flex: 1; border-bottom: 1px solid #8fa9c0; margin-bottom: 2px;
  }

  /* ── DOCUMENT FOOTER (screen only; @page handles print footer) ── */
  .report-doc-footer {
    display: flex; justify-content: space-between; align-items: center;
    border-top: 1px solid #cdd9e8; padding-top: 7px; margin-top: 10px;
    font-size: 7pt; color: #6b8099;
  }

  /* ── INSTITUTIONAL COVER PAGE (portada) ── */
  .rpt-cover {
    text-align: center; padding: 28mm 0 20mm;
    border-bottom: 3px solid #e8a000;
    page-break-after: always; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .rpt-cover img { height: 72px; margin-bottom: 18px; display: block; margin-left: auto; margin-right: auto; }
  .rc-org { font-size: 10pt; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #41546a }
  .rc-dep { font-size: 9.5pt; color: #6c757d; margin-top: 4px }
  .rc-tt { font-size: 20pt; font-weight: 800; color: #1a3a5c; margin: 22px 0 8px; line-height: 1.22 }
  .rc-sub { font-size: 10.5pt; color: #41546a; margin-bottom: 18px }
  .rc-obj { font-size: 10.5pt; font-weight: 600; color: #1f2b38; background: #f2f5fa; border: 1px solid #c8d0dc; border-radius: 6px; padding: 12px 16px; margin: 0 auto 18px; max-width: 80%; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rc-cod { display: inline-block; background: #1a3a5c; color: #fff; font-size: 10pt; font-weight: 700; letter-spacing: 1px; padding: 5px 16px; border-radius: 5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rpt-meta-table { width: 100%; border-collapse: collapse; font-size: 9.4pt; margin-top: 20px }
  .rpt-meta-table td { border: 1px solid #cdd5e0; padding: 6px 9px }
  .rpt-meta-table td.k { background: #f2f5fa; font-weight: 600; width: 35%; color: #33506e; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
`;

// ─── public print API ─────────────────────────────────────────────────────────

/**
 * Generates a complete, self-contained HTML document from report data.
 * Content is built from data directly — independent of the current DOM state.
 */
export function buildReportDocument(
  title: string,
  report: TreatmentReport,
  signatures: SignatureFieldState,
  activity?: ActivityRegistryRecord,
): string {
  const logoSrc = resolveLogoSrc();

  const activityName = activity?.nombre ?? report.nombreTratamiento;
  const activityCode = activity?.codigo ?? "No documentado";
  const responsibleDependency = activity?.dependencia ?? report.dependenciaResponsable;
  const executingDependency =
    activity?.unidadEjecutora ?? report.dependenciaEjecutora ?? report.subproceso;
  const version = activity?.version ?? "—";
  const status = activity?.estado ?? report.estado;
  const riskLevel = activity?.riesgo ?? report.nivelRiesgo;
  const lastUpdate = activity?.fechaActualizacion ?? report.ultimaActualizacion;
  const eipdRequired = activity?.requiereEipd ?? report.requiereEipd;

  const today = new Date().toLocaleDateString("es-EC", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>${reportPrintStyles}</style>
</head>
<body>

<!-- PORTADA INSTITUCIONAL -->
<div class="rpt-cover">
  <img src="${logoSrc}" alt="IESS" />
  <div class="rc-org">Instituto Ecuatoriano de Seguridad Social</div>
  <div class="rc-dep">Dirección Nacional de Seguridad de la Información y Protección de Datos — DNSIPD</div>
  <div class="rc-tt">Registro de Actividad de Tratamiento de Datos Personales</div>
  <div class="rc-sub">Ley Orgánica de Protección de Datos Personales y su Reglamento General</div>
  <div class="rc-obj">${escapeHtml(activityName ?? "")}</div>
  <div class="rc-cod">${escapeHtml(activityCode)}</div>
  <table class="rpt-meta-table" style="margin-top:22px;text-align:left"><tbody>
    <tr><td class="k">Dependencia responsable</td><td>${escapeHtml(fmtVal(responsibleDependency))}</td></tr>
    <tr><td class="k">Dependencia ejecutora</td><td>${escapeHtml(fmtVal(executingDependency))}</td></tr>
    <tr><td class="k">Estado del documento</td><td>${escapeHtml(fmtVal(status))}</td></tr>
    <tr><td class="k">Versión</td><td>${escapeHtml(version)}</td></tr>
    <tr><td class="k">Fecha de levantamiento</td><td>${escapeHtml(fmtVal(report.fechaCreacion))}</td></tr>
    <tr><td class="k">Nivel de riesgo</td><td>${escapeHtml(fmtVal(riskLevel))}</td></tr>
    <tr><td class="k">Fecha de generación</td><td>${today}</td></tr>
  </tbody></table>
</div>

<div class="report-sheet">

  <!-- MEMBRETE INSTITUCIONAL -->
  <div class="report-letterhead">
    <div class="report-letterhead-logo">
      <img src="${logoSrc}" alt="IESS" class="report-letterhead-img" />
    </div>
    <div class="report-letterhead-center">
      <strong class="report-letterhead-institution">INSTITUTO ECUATORIANO DE SEGURIDAD SOCIAL</strong>
      <span class="report-letterhead-dept">Dirección Nacional de Servicios Institucionales de Protección de Datos Personales</span>
      <span class="report-letterhead-sys">Sistema RAT — Registro de Actividades de Tratamiento</span>
    </div>
    <div class="report-letterhead-ref">
      <span class="report-letterhead-doctype">RAT</span>
      <div class="report-letterhead-code">${escapeHtml(activityCode)}</div>
      <div class="report-letterhead-ver">Versión ${escapeHtml(version)}</div>
    </div>
  </div>

  <!-- BANNER -->
  <div class="report-doc-banner">REGISTRO DE ACTIVIDAD DE TRATAMIENTO DE DATOS PERSONALES</div>

  <!-- FRANJA DE METADATOS -->
  <div class="report-meta-strip">
    <div class="report-meta-item report-meta-item-wide">
      <span class="report-meta-label">Actividad</span>
      <span class="report-meta-val">${escapeHtml(fmtVal(activityName))}</span>
    </div>
    <div class="report-meta-item report-meta-item-wide">
      <span class="report-meta-label">Dependencia responsable</span>
      <span class="report-meta-val">${escapeHtml(fmtVal(responsibleDependency))}</span>
    </div>
    <div class="report-meta-item">
      <span class="report-meta-label">Estado</span>
      <span class="report-meta-val">${escapeHtml(fmtVal(status))}</span>
    </div>
    <div class="report-meta-item">
      <span class="report-meta-label">Versión</span>
      <span class="report-meta-val">${escapeHtml(version)}</span>
    </div>
    <div class="report-meta-item">
      <span class="report-meta-label">Levantamiento</span>
      <span class="report-meta-val">${escapeHtml(fmtVal(report.fechaCreacion))}</span>
    </div>
  </div>

  <!-- SECCIONES DE CONTENIDO -->
  <div class="report-sections">
    ${sectionHtml(1, "Información general", [
      { label: "Código RAT", value: report.codigoRat },
      { label: "Código de actividad", value: activityCode },
      { label: "Nombre de la actividad", value: activityName },
      { label: "Dependencia responsable", value: responsibleDependency },
      { label: "Dependencia ejecutora / Unidad", value: executingDependency },
      { label: "Proceso relacionado", value: report.procesoRelacionado },
      { label: "Subproceso", value: report.subproceso },
      { label: "Fecha de levantamiento", value: report.fechaCreacion },
      { label: "Última actualización", value: lastUpdate },
    ])}
    ${sectionHtml(2, "Finalidad y base de licitud", [
      { label: "Finalidad específica", value: report.finalidadEspecifica },
      { label: "Base de licitud", value: report.baseLicitud },
      { label: "Norma aplicable", value: report.normaAplicable },
    ])}
    ${sectionHtml(3, "Titulares y categorías de datos personales", [
      { label: "Tipos de titulares", value: report.titulares },
      { label: "Categorías de datos personales", value: report.categoriasDatos },
      { label: "Datos sensibles", value: report.datosSensibles },
      { label: "Datos de niños, niñas y adolescentes", value: report.datosNna },
    ])}
    ${sectionHtml(4, "Activos de información asociados", [
      { label: "Activo electrónico", value: report.activoElectronico ?? report.activosInformacionAsociados },
      { label: "Activo físico", value: report.activoFisico },
      { label: "Tipo del activo", value: report.tipoActivo },
      { label: "Base de datos / Repositorio", value: report.baseDatosRepositorio },
    ])}
    ${sectionHtml(5, "Operación del tratamiento", [
      { label: "Origen de los datos", value: report.origenDatos },
      { label: "Medios de recolección", value: report.mediosRecoleccion },
      { label: "Acciones del tratamiento", value: report.accionesTratamiento },
    ])}
    ${sectionHtml(6, "Destinatarios y transferencias", [
      { label: "Destinatarios internos", value: report.destinatariosInternos },
      { label: "Destinatarios externos", value: report.destinatariosExternos },
      { label: "Transferencias internacionales", value: report.transferenciasInternacionales },
      { label: "País destino", value: report.paisDestino },
      { label: "Mecanismo de transferencia", value: report.mecanismoTransferencia },
    ])}
    ${sectionHtml(7, "Conservación y supresión", [
      { label: "Plazo de conservación", value: report.plazoConservacion },
      { label: "Criterios de conservación", value: report.criteriosConservacion },
      { label: "Supresión / Anonimización", value: report.supresionAnonimizacion },
    ])}
    ${sectionHtml(8, "Medidas de seguridad", [
      { label: "Controles aplicados", value: report.medidasSeguridad },
    ])}
    ${sectionHtml(9, "Nivel de riesgo y evaluación EIPD", [
      { label: "Nivel de riesgo", value: riskLevel },
      { label: "Requiere EIPD", value: eipdRequired },
    ])}
  </div>

  <!-- SECCIÓN DE FIRMAS -->
  <div class="report-sig-wrap">
    <div class="report-sig-banner">10. Formalización — Firmas de Aprobación</div>
    <div class="report-sig-grid">
      ${sigBlockHtml("ELABORADO POR", "elaborado", "Propietario / Levantamiento", signatures.elaboradoPorNombre, signatures.elaboradoPorCargo)}
      ${sigBlockHtml("REVISADO POR", "revisado", "Asesoría DPD / Revisor", signatures.revisadoPorNombre, signatures.revisadoPorCargo)}
      ${sigBlockHtml("AUTORIDAD", "autoridad", "Autoridad de la dependencia", signatures.autoridadNombre, signatures.autoridadCargo)}
    </div>
  </div>

  <!-- PIE DE PÁGINA (visible en pantalla; @page maneja el pie en impresión) -->
  <div class="report-doc-footer">
    <span>IESS — Sistema RAT | Documento institucional reservado</span>
    <span>Generado: ${escapeHtml(today)}</span>
  </div>

</div>
</body>
</html>`;
}

/** Opens a print dialog with the complete report generated from data. */
export function printReportDocument(
  title: string,
  report: TreatmentReport,
  signatures: SignatureFieldState,
  activity?: ActivityRegistryRecord,
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const documentHtml = buildReportDocument(title, report, signatures, activity);
  const printWindow = window.open("", "_blank", "width=1024,height=768");

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(documentHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 450);
    return;
  }

  const frame = document.createElement("iframe");
  frame.title = title;
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  frame.srcdoc = documentHtml;
  document.body.appendChild(frame);
  frame.addEventListener(
    "load",
    () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => frame.remove(), 1000);
    },
    { once: true },
  );
}
