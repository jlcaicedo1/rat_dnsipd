import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";

const navSections = [
  {
    title: "Inicio",
    items: [{ to: "/dashboard", label: "Dashboard" }],
  },
  {
    title: "Gestion RAT",
    items: [
      { to: "/rats", label: "Registro RAT" },
      { to: "/rats/new", label: "Nuevo RAT" },
      { to: "/actividades", label: "Actividades de tratamiento" },
      { to: "/activos", label: "Activos de informacion" },
    ],
  },
  {
    title: "Evaluacion y cumplimiento",
    items: [
      { to: "/mtge", label: "Evaluacion MTGE" },
      { to: "/riesgos", label: "Riesgos" },
      { to: "/eipd", label: "EIPD" },
    ],
  },
  {
    title: "Gobierno",
    items: [
      { to: "/reportes", label: "Reportes" },
      { to: "/audit", label: "Auditoria" },
      { to: "/catalogos", label: "Catalogos" },
      { to: "/estructura-organica", label: "Estructura organica" },
    ],
  },
];

export function MainLayout() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <span className="brand-kicker">Data Protection</span>
          <h1>DNSIPD</h1>
          <p>Registro, activos, riesgos y auditoria.</p>
        </div>
        <nav className="nav">
          {navSections.map((section) => (
            <div key={section.title} className="nav-section">
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "nav-link nav-link-active" : "nav-link"
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div>
            <span className="sidebar-user-label">Sesion</span>
            <strong>{user?.nombre ?? "Usuario"}</strong>
            <small>{user?.role ?? "Sin rol"}</small>
          </div>
          <button type="button" className="button-ghost" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
