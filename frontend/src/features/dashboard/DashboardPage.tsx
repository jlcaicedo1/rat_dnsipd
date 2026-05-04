import { Link } from "react-router-dom";
import { AppIcon, type AppIconName } from "../../components/AppIcon";
import { getActivityRegistryRecords, getRatRegistryRecords } from "../rat/rat-registry-data";

export function DashboardPage() {
  const ratRecords = getRatRegistryRecords();
  const activityRecords = getActivityRegistryRecords();
  const highRiskActivities = activityRecords.filter((item) => item.riesgo === "Alto");
  const eipdActivities = activityRecords.filter((item) => item.requiereEipd);
  const reviewActivities = activityRecords.filter((item) => item.estado === "En revision");

  const summary: DashboardSummaryItem[] = [
    {
      label: "RAT vigentes",
      value: String(ratRecords.filter((item) => item.estado === "Vigente").length),
      icon: "formalization",
    },
    { label: "Actividades activas", value: String(activityRecords.length), icon: "activities" },
    { label: "EIPD necesarias", value: String(eipdActivities.length), icon: "eipd" },
    { label: "Riesgos altos", value: String(highRiskActivities.length), icon: "risks" },
  ];

  return (
    <section className="dashboard-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Vista general</span>
          <div className="page-title-with-icon">
            <span className="page-title-icon">
              <AppIcon name="dashboard" size={22} strokeWidth={2.1} />
            </span>
            <h2>Dashboard institucional</h2>
          </div>
          <p className="page-copy">
            Este panel lleva al usuario directo al trabajo prioritario: tratamientos en
            revision, formalizacion pendiente y casos con mayor exposicion.
          </p>
        </div>

        <div className="registry-header-actions">
          <Link to="/actividades" className="button-primary">
            Ir a tratamientos
          </Link>
        </div>
      </header>

      <div className="summary-grid">
        {summary.map((item) => (
          <article key={item.label} className="stat-card">
            <div className="stat-card-top">
              <span>{item.label}</span>
              <span className="stat-card-icon">
                <AppIcon name={item.icon} size={18} strokeWidth={2.1} />
              </span>
            </div>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="dashboard-grid">
        <section className="panel dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">Prioridad institucional</span>
              <div className="panel-title-with-icon">
                <span className="panel-title-icon">
                  <AppIcon name="risks" size={18} strokeWidth={2.1} />
                </span>
                <h3>Tratamientos con mayor exposicion</h3>
              </div>
            </div>
            <Link to="/actividades" className="pill">
              Ver modulo
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
                    <span className={`pill risk-pill-${normalizeToken(item.riesgo)}`}>
                      {item.riesgo}
                    </span>
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
              <div className="panel-title-with-icon">
                <span className="panel-title-icon">
                  <AppIcon name="activities" size={18} strokeWidth={2.1} />
                </span>
                <h3>Actividades en revision</h3>
              </div>
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
                  <span className={`pill risk-pill-${normalizeToken(item.riesgo)}`}>
                    {item.riesgo}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel dashboard-panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">EIPD y privacidad</span>
              <div className="panel-title-with-icon">
                <span className="panel-title-icon">
                  <AppIcon name="eipd" size={18} strokeWidth={2.1} />
                </span>
                <h3>Tratamientos que exigen atencion</h3>
              </div>
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
              <div className="panel-title-with-icon">
                <span className="panel-title-icon">
                  <AppIcon name="dashboard" size={18} strokeWidth={2.1} />
                </span>
                <h3>Flujos principales</h3>
              </div>
            </div>
          </div>

          <div className="dashboard-links">
            <Link to="/actividades" className="dashboard-link-card">
              <strong>Actividades de tratamiento</strong>
              <span>Bandeja operativa con riesgo, version, trazabilidad y salida documental.</span>
            </Link>
            <Link to="/actividades/nuevo" className="dashboard-link-card">
              <strong>Nuevo tratamiento</strong>
              <span>Ingreso guiado por etapas con progreso del registro visible.</span>
            </Link>
            <Link to="/activos" className="dashboard-link-card">
              <strong>Activos de informacion</strong>
              <span>Inventario de soporte para relacionar activos, riesgos y tratamientos.</span>
            </Link>
          </div>
        </section>
      </div>
    </section>
  );
}

type DashboardSummaryItem = {
  label: string;
  value: string;
  icon: AppIconName;
};

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
