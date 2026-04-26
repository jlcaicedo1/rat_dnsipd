import { Link } from "react-router-dom";

export function RatListPage() {
  return (
    <section>
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Registro institucional</span>
          <h2>RAT</h2>
        </div>
        <Link to="/rats/new" className="button-primary">
          Crear RAT
        </Link>
      </header>
      <div className="panel">
        <p>Listado base pendiente de integracion con API.</p>
      </div>
    </section>
  );
}
