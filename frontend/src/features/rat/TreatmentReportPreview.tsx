import type { ReactNode } from "react";
import type { SignatureFieldState, TreatmentReport } from "./rat-registry-data";

type TreatmentReportPreviewProps = {
  report: TreatmentReport;
  signatures: SignatureFieldState;
  onSignatureChange: (field: keyof SignatureFieldState, value: string) => void;
  onPrint?: () => void;
  heading?: string;
};

export function TreatmentReportPreview({
  report,
  signatures,
  onSignatureChange,
  onPrint,
  heading = "Ficha del tratamiento",
}: TreatmentReportPreviewProps) {
  return (
    <section className="report-preview-shell">
      <div className="report-preview-toolbar">
        <div className="report-preview-toolbar-copy">
          <span className="brand-kicker">Vista previa formalizable</span>
          <h3>{heading}</h3>
          <p className="page-copy">
            Vista imprimible del tratamiento con espacio para formalizacion y firma.
          </p>
        </div>

        {onPrint ? (
          <div className="report-preview-toolbar-actions">
            <button type="button" className="button-secondary" onClick={onPrint}>
              Imprimir ficha
            </button>
          </div>
        ) : null}
      </div>

      <div className="report-print-surface">
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
                <input
                  className="input"
                  value={signatures.elaboradoPorNombre}
                  onChange={(event) =>
                    onSignatureChange("elaboradoPorNombre", event.target.value)
                  }
                />
                <input
                  className="input"
                  value={signatures.elaboradoPorCargo}
                  onChange={(event) =>
                    onSignatureChange("elaboradoPorCargo", event.target.value)
                  }
                />
                <div className="signature-line" />
                <small>Firma del responsable que levantó el RAT</small>
              </div>

              <div className="report-signature-card">
                <span>Responsable del tratamiento</span>
                <input
                  className="input"
                  value={signatures.responsableNombre}
                  onChange={(event) =>
                    onSignatureChange("responsableNombre", event.target.value)
                  }
                />
                <input
                  className="input"
                  value={signatures.responsableCargo}
                  onChange={(event) =>
                    onSignatureChange("responsableCargo", event.target.value)
                  }
                />
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
