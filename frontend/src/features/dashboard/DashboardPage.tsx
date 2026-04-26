const summary = [
  { label: "RAT vigentes", value: "0" },
  { label: "Actividades gran escala", value: "0" },
  { label: "EIPD pendientes", value: "0" },
  { label: "Riesgos altos", value: "0" },
];

export function DashboardPage() {
  return (
    <section>
      <header className="page-header">
        <span className="brand-kicker">Vista general</span>
        <h2>Dashboard institucional</h2>
      </header>
      <div className="summary-grid">
        {summary.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}
