import { type ReactNode } from "react";

interface ContextModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSave: () => void;
  saveLabel?: string;
  size?: "md" | "lg";
  children: ReactNode;
}

export function ContextModal({
  isOpen,
  title,
  subtitle,
  onClose,
  onSave,
  saveLabel = "Guardar",
  size = "lg",
  children,
}: ContextModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="ctx-modal-mask"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`ctx-modal ctx-modal-${size}`} role="dialog" aria-modal="true">
        <div className="ctx-modal-head">
          <div className="ctx-modal-head-text">
            <div className="ctx-modal-title">{title}</div>
            {subtitle ? <div className="ctx-modal-sub">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            className="ctx-modal-close"
            aria-label="Cerrar"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="ctx-modal-body">{children}</div>
        <div className="ctx-modal-foot">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="button-primary" onClick={onSave}>
            {saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
