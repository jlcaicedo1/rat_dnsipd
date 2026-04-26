import { Link } from "react-router-dom";
import { getActivityRegistryRecords, getRatRegistryRecords } from "../rat/rat-registry-data";

export function DashboardPage() {
  const ratRecords = getRatRegistryRecords();
  const activityRecords = getActivityRegistryRecords();
  const highRiskActivities = activityRecords.filter((item) => item.riesgo === "Alto");
  const eipdActivities = activityRecords.filter((item) => item.requiereEipd);
  const reviewActivities = activityRecords.filter((item) => item.estado === "En revision");

  const summary = [
    { label: "RAT vigentes", value: String(ratRecords.filter((item) => item.estado === "Vigente").length) },
    { label: "Actividades activas", value: String(activityRecords.length) },
    { label: "EIPD necesarias", value: String(eipdActivities.length) },
    { label: "Riesgos altos", value: String(highRiskActivities.length) },
  ];

  return (
    <section className="dashboard-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Vista general</span>
          <h2>Dashboard institucional</h2>
          <p className="page-copy">
            Este panel debe llevar al usuario directo al trabajo prioritario: RAT por formalizar,
            actividades en revision y tratamientos que exigen mayor control.
          </p>
        </div>

        <div className="registry-header-actions">
          <Link to="/rats" className="button-primary">
            Ir a Registro RAT
          </Link>
        </div>
      </header>

      <div className="summary-grid">
        {summary.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">Prioridad institucional</span>
              <h3>RAT con mayor exposicion</h3>
            </div>
            <Link to="/rats" className="pill">
              Ver consola
            </Link>
          </div>

          <div className="dashboard-list">
            {ratRecords
              .filter((item) => item.riesgo === "Alto" || item.requiereEipd)
              .slice(0, 4)
              .map((item) => (
                <article key={item.id} className="dashboard-list-item">
                  <div>
                    <strong>{item.codigo}</strong>
                    <span>{item.nombre}</span>
                  </div>
                  <div className="dashboard-list-meta">
                    <span className={`pill risk-pill-${normalizeToken(item.riesgo)}`}>{item.riesgo}</span>
                    <span className={item.requiereEipd ? "pill eipd-pill-yes" : "pill eipd-pill-no"}>
                      {item.requiereEipd ? "EIPD Si" : "EIPD No"}
                    </span>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section className="panel dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">Seguimiento operacional</span>
              <h3>Actividades en revision</h3>
            </div>
            <Link to="/actividades" className="pill">
              Ver actividades
            </Link>
          </div>

          <div className="dashboard-list">
            {reviewActivities.slice(0, 4).map((item) => (
              <article key={item.id} className="dashboard-list-item">
                <div>
                  <strong>{item.codigo}</strong>
                  <span>{item.nombre}</span>
                </div>
                <div className="dashboard-list-meta">
                  <span className="pill status-pill-en-revision">En revision</span>
                  <span className={`pill risk-pill-${normalizeToken(item.riesgo)}`}>{item.riesgo}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">EIPD y privacidad</span>
              <h3>Tratamientos que exigen atencion</h3>
            </div>
            <span className="pill">{eipdActivities.length} casos</span>
          </div>

          <div className="dashboard-list">
            {eipdActivities.slice(0, 4).map((item) => (
              <article key={item.id} className="dashboard-list-item">
                <div>
                  <strong>{item.nombre}</strong>
                  <span>{item.dependencia}</span>
                </div>
                <div className="dashboard-list-meta">
                  <span className="pill eipd-pill-yes">EIPD Si</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">Accesos rapidos</span>
              <h3>Flujos principales</h3>
            </div>
          </div>

          <div className="dashboard-links">
            <Link to="/rats" className="dashboard-link-card">
              <strong>Registro RAT</strong>
              <span>Consola maestra, ficha imprimible y aprobacion.</span>
            </Link>
            <Link to="/actividades" className="dashboard-link-card">
              <strong>Actividades</strong>
              <span>Bandeja operativa con version, riesgo y pendientes.</span>
            </Link>
            <Link to="/rats/new" className="dashboard-link-card">
              <strong>Nuevo RAT</strong>
              <span>Ingreso guiado de un nuevo registro.</span>
            </Link>
          </div>
        </section>
      </div>
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
