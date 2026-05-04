import { AppIcon, type AppIconName } from "../../components/AppIcon";
import type {
  ActivityRegistryRecord,
  ActivityTraceabilityAsset,
  ActivityTraceabilityModel,
} from "../rat/rat-registry-data";

type ActivityRelationshipGraphProps = {
  activity: ActivityRegistryRecord;
  traceability: ActivityTraceabilityModel;
};

export function ActivityRelationshipGraph({
  activity,
  traceability,
}: ActivityRelationshipGraphProps) {
  const primaryAsset = traceability.activos[0] ?? null;
  const supportAssets = traceability.activos.slice(1, 5);

  return (
    <section className="relationship-schema-card">
      <dl className="relationship-schema-meta">
        <SchemaMetaItem label="RAT" value={activity.ratCodigo} />
        <SchemaMetaItem label="Estado" value={activity.estado} />
        <SchemaMetaItem label="Riesgo" value={activity.riesgo} />
        <SchemaMetaItem label="Unidad ejecutora" value={activity.unidadEjecutora} />
      </dl>

      <div className="relationship-schema-flow-shell">
        <div className="relationship-schema-flow" aria-label="Relacion entre responsable, actividad y activo principal">
          <SchemaBlock
            icon="owner"
            kicker="Responsable"
            title={traceability.owner.nombre}
            lines={[traceability.owner.cargo, traceability.owner.unidad]}
          />

          <span className="relationship-schema-arrow" aria-hidden="true">
            →
          </span>

          <SchemaBlock
            icon="activity"
            kicker="Actividad"
            title={activity.nombre}
            lines={[activity.codigo, shortenCopy(activity.report.finalidadEspecifica, 118)]}
            variant="focus"
          />

          <span className="relationship-schema-arrow" aria-hidden="true">
            →
          </span>

          <SchemaBlock
            icon="asset"
            kicker="Activo principal"
            title={primaryAsset?.nombre ?? "Activo no definido"}
            lines={
              primaryAsset
                ? [`${primaryAsset.tipo} · ${primaryAsset.criticidad}`, primaryAsset.plataforma]
                : [
                    "Sin componente principal asociado",
                    "Revise el inventario de activos del tratamiento",
                  ]
            }
          />
        </div>
      </div>

      <div className="relationship-schema-detail-grid">
        <div className="relationship-schema-detail">
          <span className="relationship-schema-label">Soportes y artefactos tecnologicos</span>
          {supportAssets.length > 0 ? (
            <ul className="relationship-schema-list">
              {supportAssets.map((asset) => (
                <li key={asset.id}>
                  <strong>{asset.nombre}</strong>
                  <small>{formatAssetLine(asset)}</small>
                </li>
              ))}
            </ul>
          ) : (
            <span className="relationship-schema-empty">
              Esta actividad no tiene soportes secundarios registrados.
            </span>
          )}
        </div>

        <div className="relationship-schema-detail">
          <span className="relationship-schema-label">Contexto de alojamiento del dato</span>
          <dl className="relationship-schema-context">
            <SchemaContextItem
              label="Proceso"
              value={buildProcessLine(activity.report.procesoRelacionado, activity.report.subproceso)}
            />
            <SchemaContextItem
              label="Plataforma"
              value={primaryAsset?.plataforma ?? "Pendiente de asociar"}
            />
            <SchemaContextItem
              label="Custodio tecnico"
              value={primaryAsset?.custodio ?? "Pendiente"}
            />
            <SchemaContextItem
              label="Datos alojados"
              value={traceability.categoriasDatos.join(", ")}
            />
            <SchemaContextItem
              label="Controles clave"
              value={traceability.controlesClave.slice(0, 3).join(" · ")}
            />
          </dl>
        </div>
      </div>
    </section>
  );
}

function SchemaMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SchemaContextItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SchemaBlock({
  icon,
  kicker,
  title,
  lines,
  variant,
}: {
  icon: AppIconName;
  kicker: string;
  title: string;
  lines: string[];
  variant?: "focus";
}) {
  return (
    <article
      className={
        variant === "focus"
          ? "relationship-schema-block relationship-schema-block-focus"
          : "relationship-schema-block"
      }
    >
      <div className="relationship-schema-block-head">
        <span className="relationship-schema-block-icon">
          <AppIcon name={icon} size={18} strokeWidth={2.1} />
        </span>
        <span className="relationship-schema-label">{kicker}</span>
      </div>

      <strong>{title}</strong>
      {lines.map((line) => (
        <small key={line}>{line}</small>
      ))}
    </article>
  );
}

function buildProcessLine(process: string, subprocess: string) {
  if (!subprocess || subprocess === "N/A") {
    return process;
  }

  return `${process} / ${subprocess}`;
}

function formatAssetLine(asset: ActivityTraceabilityAsset) {
  return `${asset.tipo} · ${asset.criticidad} · ${asset.plataforma}`;
}

function shortenCopy(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}
