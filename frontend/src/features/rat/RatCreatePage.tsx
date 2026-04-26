export function RatCreatePage() {
  return (
    <section>
      <header className="page-header">
        <span className="brand-kicker">Nuevo registro</span>
        <h2>Crear RAT</h2>
      </header>
      <form className="panel form-grid">
        <label>
          Codigo
          <input className="input" placeholder="RAT-DNAC-001" />
        </label>
        <label>
          Nombre
          <input className="input" placeholder="Gestion de afiliacion y cobertura" />
        </label>
        <label className="full-width">
          Descripcion
          <textarea className="input textarea" rows={4} />
        </label>
        <label>
          Dependencia
          <input className="input" placeholder="Dependencia" />
        </label>
        <label>
          Subdireccion
          <input className="input" placeholder="Subdireccion opcional" />
        </label>
        <label>
          Proxima revision
          <input className="input" type="date" />
        </label>
        <div className="full-width actions">
          <button type="button" className="button-primary">
            Guardar borrador
          </button>
        </div>
      </form>
    </section>
  );
}
