import type { ReactNode, Ref } from "react";
import type {
  ActivityRegistryRecord,
  SignatureFieldState,
  TreatmentReport,
} from "./rat-registry-data";

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

type ReportField = {
  label: string;
  value: ReportValue;
};

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
  const activityName = activity?.nombre ?? report.nombreTratamiento;
  const activityCode = activity?.codigo ?? "No documentado";
  const responsibleDependency = activity?.dependencia ?? report.dependenciaResponsable;
  const executingDependency =
    activity?.unidadEjecutora ?? report.dependenciaEjecutora ?? report.subproceso;
  const version = activity?.version;
  const status = activity?.estado ?? report.estado;
  const riskLevel = activity?.riesgo ?? report.nivelRiesgo;
  const lastUpdate = activity?.fechaActualizacion ?? report.ultimaActualizacion;
  const eipdRequired = activity?.requiereEipd ?? report.requiereEipd;

  const headerFields: ReportField[] = [
    { label: "Nombre de la actividad", value: activityName },
    { label: "Codigo de la actividad", value: activityCode },
    { label: "Dependencia responsable", value: responsibleDependency },
    { label: "Fecha de levantamiento", value: report.fechaCreacion },
    { label: "Fecha de ultima actualizacion", value: lastUpdate },
    { label: "Version", value: version },
    { label: "Estado", value: status },
  ];

  const generalFields: ReportField[] = [
    { label: "Codigo RAT", value: report.codigoRat },
    { label: "Codigo de actividad", value: activityCode },
    { label: "Nombre de la actividad", value: activityName },
    { label: "Dependencia responsable", value: responsibleDependency },
    { label: "Dependencia ejecutora", value: executingDependency },
    { label: "Proceso relacionado", value: report.procesoRelacionado },
    { label: "Subproceso", value: report.subproceso },
    { label: "Estado", value: status },
    { label: "Version", value: version },
    { label: "Fecha de levantamiento", value: report.fechaCreacion },
    { label: "Fecha de ultima actualizacion", value: lastUpdate },
  ];

  const assetFields: ReportField[] = [
    {
      label: "Activo electronico",
      value: report.activoElectronico ?? report.activosInformacionAsociados,
    },
    { label: "Activo fisico", value: report.activoFisico },
    { label: "Tipo del activo", value: report.tipoActivo },
    { label: "Base de datos o repositorio", value: report.baseDatosRepositorio },
  ];

  return (
    <section className="report-preview-shell">
      {showToolbar ? (
        <div className="report-preview-toolbar">
          <div className="report-preview-toolbar-copy">
            <span className="brand-kicker">Vista previa formalizable</span>
            <h3>{heading}</h3>
            <p className="page-copy">
              Documento imprimible de una sola actividad, con trazabilidad y espacios de firma.
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
          <header className="report-sheet-header report-sheet-header-formal">
            <div className="report-title-block">
              <span className="brand-kicker">Documento institucional</span>
              <h4>REGISTRO DE ACTIVIDAD DE TRATAMIENTO</h4>
              <p>{formatReportValue(activityName)}</p>
            </div>

            <div className="report-code-box">
              <span>Codigo actividad: {formatReportValue(activityCode)}</span>
              <span>Codigo RAT: {formatReportValue(report.codigoRat)}</span>
              <span>Version: {formatReportValue(version)}</span>
            </div>
          </header>

          <ReportSection title="Membretado institucional">
            <ReportFieldTable rows={headerFields} />
          </ReportSection>

          <ReportSection title="1. Informacion general">
            <ReportFieldTable rows={generalFields} />
          </ReportSection>

          <ReportSection title="2. Finalidad y base de licitud">
            <ReportFieldTable
              rows={[
                { label: "Finalidad especifica", value: report.finalidadEspecifica },
                { label: "Base de licitud", value: report.baseLicitud },
                { label: "Norma aplicable", value: report.normaAplicable },
              ]}
            />
          </ReportSection>

          <ReportSection title="3. Titulares y categorias de datos personales">
            <ReportFieldTable
              rows={[
                { label: "Tipos de titulares", value: report.titulares },
                {
                  label: "Categorias de datos personales",
                  value: report.categoriasDatos,
                },
                { label: "Datos sensibles", value: report.datosSensibles },
                {
                  label: "Datos de ninos, ninas y adolescentes",
                  value: report.datosNna,
                },
              ]}
            />
          </ReportSection>

          <ReportSection title="4. Activos de informacion asociados">
            <ReportFieldTable rows={assetFields} />
          </ReportSection>

          <ReportSection title="5. Operacion del tratamiento">
            <ReportFieldTable
              rows={[
                { label: "Origen de los datos", value: report.origenDatos },
                { label: "Medios de recoleccion", value: report.mediosRecoleccion },
                {
                  label: "Acciones del tratamiento",
                  value: report.accionesTratamiento,
                },
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
                { label: "Pais destino", value: report.paisDestino },
                {
                  label: "Mecanismo de transferencia",
                  value: report.mecanismoTransferencia,
                },
              ]}
            />
          </ReportSection>

          <ReportSection title="7. Conservacion y supresion">
            <ReportFieldTable
              rows={[
                { label: "Plazo de conservacion", value: report.plazoConservacion },
                {
                  label: "Criterios de conservacion",
                  value: report.criteriosConservacion,
                },
                {
                  label: "Supresion o anonimizacion",
                  value: report.supresionAnonimizacion,
                },
              ]}
            />
          </ReportSection>

          <ReportSection title="8. Medidas de seguridad">
            <ReportFieldTable
              rows={[{ label: "Controles aplicados", value: report.medidasSeguridad }]}
            />
          </ReportSection>

          <ReportSection title="9. Nivel de riesgo y evaluacion EIPD">
            <ReportFieldTable
              rows={[
                { label: "Nivel de riesgo", value: riskLevel },
                { label: "Requiere EIPD", value: eipdRequired },
              ]}
            />
          </ReportSection>

          <ReportSection title="10. Formalizacion">
            <div className="report-signature-grid">
              <SignatureCard
                cargo={signatures.elaboradoPorCargo}
                label="Propietario de la actividad de tratamiento"
                name={signatures.elaboradoPorNombre}
                nameField="elaboradoPorNombre"
                cargoField="elaboradoPorCargo"
                onSignatureChange={onSignatureChange}
                readOnly={readOnly}
              />

              <SignatureCard
                cargo={signatures.responsableCargo}
                label="Responsable del Tratamiento de Datos"
                name={signatures.responsableNombre}
                nameField="responsableNombre"
                cargoField="responsableCargo"
                onSignatureChange={onSignatureChange}
                readOnly={readOnly}
              />
            </div>
          </ReportSection>
        </article>
      </div>
    </section>
  );
}

const reportDocumentStyles = `
  :root {
    color-scheme: light;
    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
  }
  @page {
    size: A4;
    margin: 16mm;
  }
  * {
    box-sizing: border-box;
  }
  body {
    margin: 0;
    background: #ffffff;
    color: #102033;
    padding: 0;
  }
  .report-sheet {
    display: grid;
    gap: 12px;
    max-width: 180mm;
    margin: 0 auto;
    background: #ffffff;
    padding: 0;
  }
  .report-sheet-header {
    display: grid;
    gap: 12px;
    margin-bottom: 2px;
  }
  .brand-kicker {
    color: #1f9abb;
    display: inline-block;
    font-size: 0.72rem;
    font-weight: 900;
    letter-spacing: 0.16em;
    text-transform: uppercase;
  }
  .report-title-block {
    min-width: 0;
    text-align: center;
  }
  .report-title-block h4 {
    margin: 6px 0 0;
    letter-spacing: 0.02em;
  }
  .report-title-block p {
    color: #64748b;
    margin: 8px 0 0;
  }
  .report-code-box {
    display: none;
  }
  .report-code-box span,
  .report-signature-card small,
  .report-signature-date {
    font-size: 0.84rem;
  }
  .report-section {
    border: 1px solid rgba(18, 32, 51, 0.08);
    border-radius: 8px;
    overflow: hidden;
  }
  .report-section-title {
    background: rgba(43, 149, 199, 0.08);
    color: #0f6fae;
    font-size: 0.82rem;
    font-weight: 900;
    padding: 10px 14px;
    text-transform: uppercase;
  }
  .report-field-table {
    border-collapse: collapse;
    width: 100%;
  }
  .report-field-table th,
  .report-field-table td {
    border-top: 1px solid rgba(18, 32, 51, 0.08);
    line-height: 1.45;
    padding: 8px 12px;
    vertical-align: top;
  }
  .report-field-table tr:first-child th,
  .report-field-table tr:first-child td {
    border-top: 0;
  }
  .report-field-table th {
    color: #0f2746;
    font-size: 0.82rem;
    font-weight: 900;
    text-align: right;
    width: 32%;
  }
  .report-field-table td {
    text-align: left;
    overflow-wrap: anywhere;
  }
  .report-empty-value {
    color: #64748b;
    font-style: italic;
  }
  .report-signature-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    padding: 14px;
  }
  .report-signature-card {
    display: grid;
    gap: 10px;
  }
  .report-signature-card span {
    color: #0f2746;
    font-weight: 800;
  }
  .report-signature-value {
    border: 1px solid #d9e3ee;
    border-radius: 8px;
    background: #f8fbfd;
    line-height: 1.45;
    min-height: 44px;
    padding: 12px 14px;
  }
  .report-signature-value-muted {
    color: #64748b;
  }
  .signature-line {
    border-bottom: 1px solid #4a5e73;
    height: 32px;
    margin-top: 12px;
  }
  .report-signature-date {
    color: #4a5e73;
  }
  @media print {
    @page {
      size: A4;
      margin: 16mm;
    }
    body {
      background: #ffffff;
      padding: 0;
    }
    .report-sheet {
      border: 0;
      box-shadow: none;
      border-radius: 0;
      margin: 0;
      max-width: none;
      padding: 0;
    }
  }
`;

export function buildReportPreviewDocument(title: string, bodyMarkup: string) {
  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${reportDocumentStyles}</style>
  </head>
  <body>
    ${bodyMarkup}
  </body>
</html>`;
}

export function printReportPreviewDocument(title: string, bodyMarkup: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const documentHtml = buildReportPreviewDocument(title, bodyMarkup);
  const printWindow = window.open("", "_blank", "width=1024,height=768");

  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(documentHtml);
    printWindow.document.close();
    printWindow.focus();
    printWindow.setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    return;
  }

  const frame = document.createElement("iframe");
  frame.title = title;
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
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

function ReportSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="report-section">
      <div className="report-section-title">{title}</div>
      {children}
    </section>
  );
}

function ReportFieldTable({ rows }: { rows: ReportField[] }) {
  return (
    <table className="report-field-table">
      <tbody>
        {rows.map((row) => {
          const formattedValue = formatReportValue(row.value);
          const isEmpty = formattedValue === "No documentado";

          return (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              <td className={isEmpty ? "report-empty-value" : undefined}>
                {formattedValue}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function SignatureCard({
  cargo,
  cargoField,
  label,
  name,
  nameField,
  onSignatureChange,
  readOnly,
}: {
  cargo: string;
  cargoField: keyof SignatureFieldState;
  label: string;
  name: string;
  nameField: keyof SignatureFieldState;
  onSignatureChange?: (field: keyof SignatureFieldState, value: string) => void;
  readOnly: boolean;
}) {
  return (
    <div className="report-signature-card">
      <span>{label}</span>
      {readOnly ? (
        <>
          <div className="report-signature-value">{formatReportValue(name)}</div>
          <div className="report-signature-value report-signature-value-muted">
            {formatReportValue(cargo)}
          </div>
        </>
      ) : (
        <>
          <input
            className="input"
            value={name}
            onChange={(event) => onSignatureChange?.(nameField, event.target.value)}
          />
          <input
            className="input"
            value={cargo}
            onChange={(event) => onSignatureChange?.(cargoField, event.target.value)}
          />
        </>
      )}
      <div className="signature-line" />
      <div className="report-signature-date">Fecha: ____________________</div>
    </div>
  );
}

function formatReportValue(value: ReportValue) {
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }

  if (value === null || value === undefined) {
    return "No documentado";
  }

  const text = String(value).trim();

  return text.length > 0 ? text : "No documentado";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
