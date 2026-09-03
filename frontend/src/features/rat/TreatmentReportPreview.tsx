import iessLogoUrl from "../../assets/iess-logo-color.png";
import { buildInstitutionalReport, rptTable } from "../../utils/buildInstitutionalReport";
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
                  { label: "Descripción Base Legitimadora", value: report.normaAplicable },
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
  if (text.includes("\n")) {
    return <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.6" }}>{text}</div>;
  }
  const parts = text
    .split(/\s*;\s*/)
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

function fmtHtml(value: ReportValue): string {
  const text = fmtVal(value);
  if (text === "No documentado")
    return `<em style="color:#94a3b8">No documentado</em>`;
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped.replace(/\n\n+/g, "<br><br>").replace(/\n/g, "<br>");
}

// ─── print document (standalone HTML via buildInstitutionalReport) ────────────

/**
 * Generates a complete, self-contained HTML document from report data
 * using the institutional report format shared with EIPD reports.
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

  const fv = (v: ReportValue) => fmtVal(v);
  const fh = (v: ReportValue) => fmtHtml(v);
  const fieldTable = (rows: Array<{ label: string; value: ReportValue }>) =>
    rptTable(
      ["Campo", "Valor"],
      rows.map((r) => [r.label, fh(r.value)]),
      ["35%", "65%"],
    );

  return buildInstitutionalReport({
    logoSrc,
    title: "Registro de Actividad de Tratamiento de Datos Personales",
    subtitle: "Ley Orgánica de Protección de Datos Personales y su Reglamento General",
    objective: fv(activityName),
    code: activityCode,
    metadata: [
      ["Responsable del tratamiento", fv(responsibleDependency)],
      ["Actividad de tratamiento", fv(activityName)],
      ["Código RAT", fv(report.codigoRat)],
      ["Dependencia ejecutora", fv(executingDependency)],
      ["Estado del documento", fv(status)],
      ["Versión", version],
      ["Fecha de levantamiento", fv(report.fechaCreacion)],
      ["Nivel de riesgo", fv(riskLevel)],
    ],
    toc: [
      "Información general",
      "Finalidad y base de licitud",
      "Titulares y categorías de datos personales",
      "Activos de información asociados",
      "Operación del tratamiento",
      "Destinatarios y transferencias",
      "Conservación y supresión",
      "Medidas de seguridad",
      "Nivel de riesgo y evaluación EIPD",
    ],
    sections: [
      {
        heading: "1. Información general",
        html: fieldTable([
          { label: "Código RAT", value: report.codigoRat },
          { label: "Código de actividad", value: activityCode },
          { label: "Nombre de la actividad", value: activityName },
          { label: "Dependencia responsable", value: responsibleDependency },
          { label: "Dependencia ejecutora / Unidad", value: executingDependency },
          { label: "Proceso relacionado", value: report.procesoRelacionado },
          { label: "Subproceso", value: report.subproceso },
          { label: "Fecha de levantamiento", value: report.fechaCreacion },
          { label: "Última actualización", value: lastUpdate },
        ]),
      },
      {
        heading: "2. Finalidad y base de licitud",
        html: fieldTable([
          { label: "Finalidad específica", value: report.finalidadEspecifica },
          { label: "Base de licitud", value: report.baseLicitud },
          { label: "Descripción Base Legitimadora", value: report.normaAplicable },
        ]),
      },
      {
        heading: "3. Titulares y categorías de datos personales",
        html: fieldTable([
          { label: "Tipos de titulares", value: report.titulares },
          { label: "Categorías de datos personales", value: report.categoriasDatos },
          { label: "Datos sensibles", value: report.datosSensibles },
          { label: "Datos de niños, niñas y adolescentes", value: report.datosNna },
        ]),
      },
      {
        heading: "4. Activos de información asociados",
        html: fieldTable([
          {
            label: "Activo electrónico",
            value: report.activoElectronico ?? report.activosInformacionAsociados,
          },
          { label: "Activo físico", value: report.activoFisico },
          { label: "Tipo del activo", value: report.tipoActivo },
          { label: "Base de datos / Repositorio", value: report.baseDatosRepositorio },
        ]),
      },
      {
        heading: "5. Operación del tratamiento",
        html: fieldTable([
          { label: "Origen de los datos", value: report.origenDatos },
          { label: "Medios de recolección", value: report.mediosRecoleccion },
          { label: "Acciones del tratamiento", value: report.accionesTratamiento },
        ]),
      },
      {
        heading: "6. Destinatarios y transferencias",
        html: fieldTable([
          { label: "Destinatarios internos", value: report.destinatariosInternos },
          { label: "Destinatarios externos", value: report.destinatariosExternos },
          {
            label: "Transferencias internacionales",
            value: report.transferenciasInternacionales,
          },
          { label: "País destino", value: report.paisDestino },
          { label: "Mecanismo de transferencia", value: report.mecanismoTransferencia },
        ]),
      },
      {
        heading: "7. Conservación y supresión",
        html: fieldTable([
          { label: "Plazo de conservación", value: report.plazoConservacion },
          { label: "Criterios de conservación", value: report.criteriosConservacion },
          { label: "Supresión / Anonimización", value: report.supresionAnonimizacion },
        ]),
      },
      {
        heading: "8. Medidas de seguridad",
        html: fieldTable([{ label: "Controles aplicados", value: report.medidasSeguridad }]),
      },
      {
        heading: "9. Nivel de riesgo y evaluación EIPD",
        html: fieldTable([
          { label: "Nivel de riesgo", value: riskLevel },
          { label: "Requiere EIPD", value: eipdRequired },
        ]),
      },
    ],
    signatures: [
      {
        role: "ELABORADO POR",
        name: signatures.elaboradoPorNombre,
        cargo: signatures.elaboradoPorCargo,
      },
      {
        role: "REVISADO POR",
        name: signatures.revisadoPorNombre,
        cargo: signatures.revisadoPorCargo,
      },
      {
        role: "AUTORIDAD",
        name: signatures.autoridadNombre,
        cargo: signatures.autoridadCargo,
      },
    ],
    footerText:
      "Instituto Ecuatoriano de Seguridad Social — Dirección Nacional de Seguridad de la Información y Protección de Datos | Registro de Actividades de Tratamiento (RAT) | Documento de uso interno",
  });
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
