import { useEffect, type RefObject } from "react";
import type {
  ActivityRegistryRecord,
  SignatureFieldState,
  TreatmentReport,
} from "./rat-registry-data";
import { TreatmentReportPreview } from "./TreatmentReportPreview";

type ReportPreviewModalProps = {
  isOpen: boolean;
  heading: string;
  report: TreatmentReport;
  signatures: SignatureFieldState;
  activity?: ActivityRegistryRecord;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
  surfaceRef: RefObject<HTMLDivElement>;
};

export function ReportPreviewModal({
  isOpen,
  heading,
  report,
  signatures,
  activity,
  onClose,
  onPrint,
  onDownload,
  surfaceRef,
}: ReportPreviewModalProps) {
  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    if (!isOpen) {
      document.body.classList.remove("report-print-mode");
      return;
    }

    document.body.classList.add("report-print-mode");

    return () => {
      document.body.classList.remove("report-print-mode");
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="report-preview-modal" role="dialog" aria-modal="true" aria-labelledby="report-preview-title">
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar vista previa"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Vista previa del reporte</span>
            <h3 id="report-preview-title">{heading}</h3>
            <p className="page-copy">
              Revise el contenido, formato y disposicion final del documento antes de imprimirlo o guardarlo como PDF.
            </p>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button type="button" className="button-secondary" onClick={onDownload}>
              Descargar vista
            </button>
            <button type="button" className="button-primary" onClick={onPrint}>
              Imprimir / PDF
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <TreatmentReportPreview
            activity={activity}
            heading={heading}
            readOnly
            report={report}
            showToolbar={false}
            signatures={signatures}
            surfaceRef={surfaceRef}
          />
        </div>
      </div>
    </div>
  );
}
