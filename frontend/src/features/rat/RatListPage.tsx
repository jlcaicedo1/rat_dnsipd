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
        <p>
          Cada RAT debe pertenecer a una unidad responsable padre. Las
          subdirecciones y unidades hijas ejecutan actividades, pero no
          necesariamente requieren un RAT independiente por cada una.
        </p>
      </div>
      <div className="panel">
        <p>
          La automatizacion recomendada es filtrar los RAT por la unidad
          organica seleccionada y sugerir el RAT correcto dentro de ese
          conjunto, en lugar de asignarlo de forma ciega.
        </p>
      </div>
    </section>
  );
}
