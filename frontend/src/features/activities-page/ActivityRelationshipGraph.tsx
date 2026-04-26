import type {
  ActivityRegistryRecord,
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
  const secondaryAssets = traceability.activos.slice(1);

  return (
    <section className="relationship-focus-card">
      <header className="relationship-focus-header">
        <div className="relationship-focus-intro">
          <span className="brand-kicker">Mapa de relaciones</span>
          <h3>{activity.nombre}</h3>
          <p className="page-copy relationship-purpose-copy">
            {activity.report.finalidadEspecifica}
          </p>
        </div>

        <div className="relationship-focus-badges">
          <span className={`pill status-pill-${normalizeToken(activity.estado)}`}>
            {activity.estado}
          </span>
          <span className={`pill risk-pill-${normalizeToken(activity.riesgo)}`}>{activity.riesgo}</span>
          <span className={activity.requiereEipd ? "pill eipd-pill-yes" : "pill eipd-pill-no"}>
            {activity.requiereEipd ? "EIPD Si" : "EIPD No"}
          </span>
        </div>
      </header>

      <dl className="relationship-context-strip">
        <div>
          <dt>RAT</dt>
          <dd>{activity.ratCodigo}</dd>
        </div>
        <div>
          <dt>Dependencia</dt>
          <dd>{activity.dependencia}</dd>
        </div>
        <div>
          <dt>Unidad ejecutora</dt>
          <dd>{activity.unidadEjecutora}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{activity.version}</dd>
        </div>
      </dl>

      <div className="relationship-focus-stage">
        <div className="relationship-node-card relationship-node-card-owner">
          <span className="relationship-node-label">Dueno</span>
          <strong>{traceability.owner.nombre}</strong>
          <small>{traceability.owner.cargo}</small>
          <small>{traceability.owner.unidad}</small>
        </div>

        <div className="relationship-bridge" aria-hidden="true">
          <span />
        </div>

        <div className="relationship-node-card relationship-node-card-activity">
          <span className="relationship-node-label">Actividad</span>
          <strong>{activity.codigo}</strong>
          <small>{activity.nombre}</small>
          <p>{activity.report.procesoRelacionado}</p>
        </div>

        <div className="relationship-bridge" aria-hidden="true">
          <span />
        </div>

        <div className="relationship-node-card relationship-node-card-asset">
          <span className="relationship-node-label">Activo de soporte</span>
          {primaryAsset ? (
            <>
              <strong>{primaryAsset.nombre}</strong>
              <small>
                {primaryAsset.tipo} · criticidad {primaryAsset.criticidad}
              </small>
              <small>
                Custodio {primaryAsset.custodio} · {primaryAsset.plataforma}
              </small>
            </>
          ) : (
            <>
              <strong>Activo pendiente</strong>
              <small>La actividad aun no tiene un activo de soporte documentado.</small>
            </>
          )}
        </div>
      </div>

      {secondaryAssets.length > 0 ? (
        <div className="relationship-support-strip">
          <span>Soportes adicionales</span>
          <div className="relationship-support-chips">
            {secondaryAssets.map((asset) => (
              <article key={asset.id} className="relationship-support-chip">
                <strong>{asset.nombre}</strong>
                <small>
                  {asset.tipo} · {asset.criticidad}
                </small>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
