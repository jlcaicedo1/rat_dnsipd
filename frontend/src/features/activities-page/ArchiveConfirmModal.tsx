import { useState } from "react";

type ArchiveConfirmModalProps = {
  activityCodigo: string;
  activityNombre: string;
  isSubmitting: boolean;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
};

export function ArchiveConfirmModal({
  activityCodigo,
  activityNombre,
  isSubmitting,
  onConfirm,
  onCancel,
}: ArchiveConfirmModalProps) {
  const [motivo, setMotivo] = useState("");
  const canConfirm = motivo.trim().length > 0 && !isSubmitting;

  return (
    <div className="report-preview-modal" role="dialog" aria-modal="true" aria-labelledby="archive-modal-title">
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cancelar archivo"
        onClick={onCancel}
        disabled={isSubmitting}
      />

      <div className="report-preview-modal-dialog" style={{ maxWidth: 520 }}>
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Accion irreversible</span>
            <h3 id="archive-modal-title">Archivar actividad</h3>
            <p className="page-copy">
              <strong>{activityCodigo}</strong> &mdash; {activityNombre}
            </p>
          </div>

          <div className="report-preview-modal-actions">
            <button
              type="button"
              className="button-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body" style={{ padding: "1.5rem" }}>
          <p style={{ marginBottom: "1rem", color: "var(--text-secondary, #64748b)" }}>
            Al archivar esta actividad dejara de aparecer en la vista de trabajo del Revisor.
            La informacion se conserva integra para consultas historicas.
          </p>

          <label className="field" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span>
              Motivo del archivo <span aria-hidden="true" style={{ color: "var(--danger, #dc2626)" }}>*</span>
            </span>
            <textarea
              className="input"
              rows={4}
              placeholder="Describa el motivo por el cual se archiva esta actividad..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              style={{ resize: "vertical" }}
            />
          </label>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1.25rem" }}>
            <button
              type="button"
              className="button-secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="button-table-action button-table-action-danger"
              onClick={() => onConfirm(motivo.trim())}
              disabled={!canConfirm}
            >
              {isSubmitting ? "Archivando..." : "Confirmar archivo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
