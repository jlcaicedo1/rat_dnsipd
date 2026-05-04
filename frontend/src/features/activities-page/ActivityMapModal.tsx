import type {
  ActivityRegistryRecord,
  ActivityTraceabilityModel,
} from "../rat/rat-registry-data";
import { ActivityRelationshipGraph } from "./ActivityRelationshipGraph";
import { AppIcon } from "../../components/AppIcon";

type ActivityMapModalProps = {
  isOpen: boolean;
  activity: ActivityRegistryRecord;
  traceability: ActivityTraceabilityModel;
  onClose: () => void;
};

export function ActivityMapModal({
  isOpen,
  activity,
  traceability,
  onClose,
}: ActivityMapModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="activity-map-title"
    >
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar mapa de relaciones"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog report-preview-modal-dialog-wide">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Mapa de relaciones</span>
            <div className="page-title-with-icon page-title-with-icon-modal">
              <span className="page-title-icon">
                <AppIcon name="map" size={20} strokeWidth={2.1} />
              </span>
              <h3 id="activity-map-title">{activity.nombre}</h3>
            </div>
            <p className="page-copy">{activity.codigo}</p>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body relationship-modal-body">
          <ActivityRelationshipGraph activity={activity} traceability={traceability} />
        </div>
      </div>
    </div>
  );
}
