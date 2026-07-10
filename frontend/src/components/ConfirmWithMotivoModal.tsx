import { useState } from "react";

type Variant = "danger" | "warning" | "primary";

type ConfirmWithMotivoModalProps = {
  title: string;
  description?: string;
  actionLabel: string;
  variant?: Variant;
  isSubmitting: boolean;
  onConfirm: (motivo: string) => void;
  onCancel: () => void;
};

const variantClass: Record<Variant, string> = {
  danger: "button-table-action button-table-action-danger",
  warning: "button-table-action",
  primary: "button-table-action button-table-action-primary",
};

const warningStyle: Record<Variant, React.CSSProperties> = {
  danger: {},
  warning: { borderColor: "var(--warning, #d97706)", color: "var(--warning, #d97706)" },
  primary: {},
};

export function ConfirmWithMotivoModal({
  title,
  description,
  actionLabel,
  variant = "primary",
  isSubmitting,
  onConfirm,
  onCancel,
}: ConfirmWithMotivoModalProps) {
  const [motivo, setMotivo] = useState("");
  const canConfirm = motivo.trim().length > 0 && !isSubmitting;

  return (
    <div className="report-preview-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-motivo-title">
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cancelar"
        onClick={onCancel}
        disabled={isSubmitting}
      />

      <div className="report-preview-modal-dialog" style={{ maxWidth: 520 }}>
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Confirmacion requerida</span>
            <h3 id="confirm-motivo-title">{title}</h3>
            {description && <p className="page-copy">{description}</p>}
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
          <label className="field" style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <span>
              Motivo <span aria-hidden="true" style={{ color: "var(--danger, #dc2626)" }}>*</span>
            </span>
            <textarea
              className="input"
              rows={4}
              placeholder="Describa el motivo de esta accion..."
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
              className={variantClass[variant]}
              style={warningStyle[variant]}
              onClick={() => onConfirm(motivo.trim())}
              disabled={!canConfirm}
            >
              {isSubmitting ? "Procesando..." : actionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
