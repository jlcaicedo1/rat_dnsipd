import type { ReactNode, Ref } from "react";
import type { SignatureFieldState, TreatmentReport } from "./rat-registry-data";

type TreatmentReportPreviewProps = {
  report: TreatmentReport;
  signatures: SignatureFieldState;
  onSignatureChange?: (field: keyof SignatureFieldState, value: string) => void;
  onPrint?: () => void;
  heading?: string;
  readOnly?: boolean;
  showToolbar?: boolean;
  toolbarActions?: ReactNode;
  surfaceRef?: Ref<HTMLDivElement>;
};

export function TreatmentReportPreview({
  report,
  signatures,
  onSignatureChange,
  onPrint,
  heading = "Ficha del tratamiento",
  readOnly = false,
  showToolbar = true,
  toolbarActions,
  surfaceRef,
}: TreatmentReportPreviewProps) {
  return (
    <section className="report-preview-shell">
      {showToolbar ? (
        <div className="report-preview-toolbar">
          <div className="report-preview-toolbar-copy">
            <span className="brand-kicker">Vista previa formalizable</span>
            <h3>{heading}</h3>
            <p className="page-copy">
              Vista imprimible del tratamiento con espacio para formalizacion y firma.
            </p>
          </div>

          <div className="report-preview-toolbar-actions">
            {toolbarActions}
            {!toolbarActions && onPrint ? (
              <button type="button" className="button-secondary" onClick={onPrint}>
                Imprimir ficha
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="report-print-surface" ref={surfaceRef}>
        <article className="report-sheet">
          <header className="report-sheet-header">
            <div className="report-brand">
              <div className="brand-mark">R</div>
              <div>
                <strong>DNSIPD</strong>
                <small>RAT · Activos · Riesgo</small>
              </div>
            </div>

            <div className="report-title-block">
              <h4>FICHA DEL TRATAMIENTO</h4>
              <p>Registro de Actividades de Tratamiento</p>
            </div>

            <div className="report-code-box">
              <span>Codigo: {report.codigoRat}</span>
              <span>Fecha: {report.ultimaActualizacion}</span>
              <span>Version: 1.0</span>
            </div>
          </header>

          <ReportSection title="1. Informacion general">
            <dl className="report-grid">
              <ReportRow label="Nombre del tratamiento" value={report.nombreTratamiento} />
              <ReportRow label="Estado" value={report.estado} />
              <ReportRow label="Dependencia responsable" value={report.dependenciaResponsable} />
              <ReportRow label="Nivel de riesgo" value={report.nivelRiesgo} />
              <ReportRow label="Proceso relacionado" value={report.procesoRelacionado} />
              <ReportRow label="Requiere EIPD" value={report.requiereEipd ? "Si" : "No"} />
              <ReportRow label="Subproceso" value={report.subproceso} />
              <ReportRow label="Fecha de creacion" value={report.fechaCreacion} />
              <ReportRow label="Ultima actualizacion" value={report.ultimaActualizacion} span />
            </dl>
          </ReportSection>

          <ReportSection title="2. Finalidad y base legal">
            <dl className="report-grid report-grid-single">
              <ReportRow label="Finalidad especifica" value={report.finalidadEspecifica} span />
              <ReportRow label="Base de licitud" value={report.baseLicitud} />
              <ReportRow label="Norma aplicable" value={report.normaAplicable} span />
            </dl>
          </ReportSection>

          <ReportSection title="3. Titulares y datos personales">
            <dl className="report-grid">
              <ReportRow label="Tipos de titulares" value={report.titulares} span />
              <ReportRow
                label="Categorias de datos personales"
                value={report.categoriasDatos}
                span
              />
              <ReportRow label="Datos sensibles" value={report.datosSensibles} />
              <ReportRow label="Datos de ninos, ninas y adolescentes" value={report.datosNna} />
            </dl>
          </ReportSection>

          <ReportSection title="4. Operacion del tratamiento">
            <dl className="report-grid">
              <ReportRow label="Origen de los datos" value={report.origenDatos} />
              <ReportRow label="Plazo de conservacion" value={report.plazoConservacion} />
              <ReportRow label="Medios de recoleccion" value={report.mediosRecoleccion} />
              <ReportRow
                label="Criterios de conservacion"
                value={report.criteriosConservacion}
              />
              <ReportRow label="Acciones del tratamiento" value={report.accionesTratamiento} />
              <ReportRow
                label="Supresion o anonimizacion"
                value={report.supresionAnonimizacion}
              />
            </dl>
          </ReportSection>

          <ReportSection title="5. Destinatarios y transferencias">
            <dl className="report-grid">
              <ReportRow label="Destinatarios internos" value={report.destinatariosInternos} />
              <ReportRow
                label="Transferencias internacionales"
                value={report.transferenciasInternacionales}
              />
              <ReportRow label="Destinatarios externos" value={report.destinatariosExternos} />
              <ReportRow label="Pais destino" value={report.paisDestino} />
              <ReportRow
                label="Mecanismo de transferencia"
                value={report.mecanismoTransferencia}
                span
              />
            </dl>
          </ReportSection>

          <ReportSection title="6. Medidas de seguridad">
            <dl className="report-grid report-grid-single">
              <ReportRow label="Controles aplicados" value={report.medidasSeguridad} span />
            </dl>
          </ReportSection>

          <ReportSection title="7. Formalizacion y aprobacion">
            <div className="report-signature-grid">
              <div className="report-signature-card">
                <span>Elaborado por</span>
                {readOnly ? (
                  <>
                    <div className="report-signature-value">
                      {signatures.elaboradoPorNombre}
                    </div>
                    <div className="report-signature-value report-signature-value-muted">
                      {signatures.elaboradoPorCargo}
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      className="input"
                      value={signatures.elaboradoPorNombre}
                      onChange={(event) =>
                        onSignatureChange?.("elaboradoPorNombre", event.target.value)
                      }
                    />
                    <input
                      className="input"
                      value={signatures.elaboradoPorCargo}
                      onChange={(event) =>
                        onSignatureChange?.("elaboradoPorCargo", event.target.value)
                      }
                    />
                  </>
                )}
                <div className="signature-line" />
                <small>Firma del responsable que levantó el RAT</small>
              </div>

              <div className="report-signature-card">
                <span>Responsable del tratamiento</span>
                {readOnly ? (
                  <>
                    <div className="report-signature-value">
                      {signatures.responsableNombre}
                    </div>
                    <div className="report-signature-value report-signature-value-muted">
                      {signatures.responsableCargo}
                    </div>
                  </>
                ) : (
                  <>
                    <input
                      className="input"
                      value={signatures.responsableNombre}
                      onChange={(event) =>
                        onSignatureChange?.("responsableNombre", event.target.value)
                      }
                    />
                    <input
                      className="input"
                      value={signatures.responsableCargo}
                      onChange={(event) =>
                        onSignatureChange?.("responsableCargo", event.target.value)
                      }
                    />
                  </>
                )}
                <div className="signature-line" />
                <small>Firma de aprobacion y formalizacion</small>
              </div>
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
  body {
    margin: 0;
    background: #f4f9fc;
    color: #102033;
    padding: 24px;
  }
  .report-sheet {
    display: grid;
    gap: 14px;
    max-width: 1040px;
    margin: 0 auto;
    border: 1px solid rgba(18, 32, 51, 0.08);
    border-radius: 10px;
    background: #ffffff;
    box-shadow: 0 18px 40px rgba(20, 45, 78, 0.08);
    padding: 24px;
  }
  .report-sheet-header {
    display: grid;
    grid-template-columns: minmax(0, 0.72fr) minmax(0, 1fr) minmax(0, 0.72fr);
    gap: 16px;
    align-items: start;
  }
  .report-brand {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .brand-mark {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 1px solid rgba(255, 255, 255, 0.22);
    border-radius: 8px;
    background: linear-gradient(135deg, #eef9ff, #7cc7ec);
    color: #0f2746;
    font-weight: 900;
    letter-spacing: -0.08em;
  }
  .report-brand small {
    color: #64748b;
    display: block;
    margin-top: 4px;
  }
  .report-title-block {
    text-align: center;
  }
  .report-title-block h4 {
    margin: 0;
    letter-spacing: 0.02em;
  }
  .report-title-block p {
    color: #64748b;
    margin: 8px 0 0;
  }
  .report-code-box {
    display: grid;
    gap: 8px;
    border: 1px solid rgba(18, 32, 51, 0.08);
    border-radius: 8px;
    background: #f7fbff;
    padding: 12px;
  }
  .report-code-box span,
  .report-signature-card small {
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
    font-size: 0.9rem;
    font-weight: 900;
    padding: 10px 14px;
    text-transform: uppercase;
  }
  .report-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    margin: 0;
    padding: 14px;
  }
  .report-grid-single {
    grid-template-columns: 1fr;
  }
  .report-row {
    display: grid;
    gap: 6px;
  }
  .report-row-span {
    grid-column: 1 / -1;
  }
  .report-row dt {
    color: #0f2746;
    font-size: 0.77rem;
    font-weight: 900;
    text-transform: uppercase;
  }
  .report-row dd {
    margin: 0;
    line-height: 1.55;
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
    height: 28px;
    margin-top: 10px;
  }
  @media print {
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

function ReportRow({
  label,
  value,
  span = false,
}: {
  label: string;
  value: string;
  span?: boolean;
}) {
  return (
    <div className={span ? "report-row report-row-span" : "report-row"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
