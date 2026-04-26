type ModulePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  scope: string[];
  metrics: Array<{
    label: string;
    value: string;
  }>;
};

export function ModulePage({
  eyebrow,
  title,
  description,
  status,
  scope,
  metrics,
}: ModulePageProps) {
  return (
    <section>
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="page-copy">{description}</p>
        </div>
        <span className="status-pill">{status}</span>
      </header>

      <div className="summary-grid">
        {metrics.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="module-grid">
        {scope.map((item) => (
          <article key={item} className="module-card">
            <span className="module-bullet" />
            <p>{item}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
