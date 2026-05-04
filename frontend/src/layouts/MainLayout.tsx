import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppIcon, type AppIconName } from "../components/AppIcon";
import { useAuthStore } from "../features/auth/auth-store";

const navSections = [
  {
    title: "Inicio",
    items: [{ to: "/dashboard", label: "Dashboard", icon: "dashboard" }],
  },
  {
    title: "Nucleo operativo",
    items: [
      { to: "/actividades", label: "Actividades de tratamiento", icon: "activities" },
      { to: "/activos", label: "Activos de informacion", icon: "assets" },
    ],
  },
  {
    title: "Evaluacion y cumplimiento",
    items: [
      { to: "/mtge", label: "Evaluacion MTGE", icon: "mtge" },
      { to: "/riesgos", label: "Riesgos", icon: "risks" },
      { to: "/eipd", label: "EIPD", icon: "eipd" },
    ],
  },
  {
    title: "Gobierno y administracion",
    items: [
      { to: "/reportes", label: "Reportes", icon: "reports" },
      { to: "/audit", label: "Auditoria", icon: "audit" },
      { to: "/catalogos", label: "Catalogos", icon: "catalogs" },
      { to: "/estructura-organica", label: "Estructura organica", icon: "organization" },
    ],
  },
] as const satisfies Array<{
  title: string;
  items: Array<{ to: string; label: string; icon: AppIconName }>;
}>;

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={isSidebarOpen ? "app-shell app-shell-mobile-open" : "app-shell"}>
      <button
        type="button"
        className={isSidebarOpen ? "sidebar-overlay sidebar-overlay-visible" : "sidebar-overlay"}
        aria-label="Cerrar menu"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">R</div>
          <span className="brand-kicker">Privacidad institucional</span>
          <h1>DNSIPD</h1>
          <p>Tratamientos, activos, riesgo, auditoria y gobierno del dato.</p>
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
                  <span className="nav-link-content">
                    <span className="nav-link-icon">
                      <AppIcon name={item.icon} size={17} strokeWidth={2.1} />
                    </span>
                    <span>{item.label}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-cta">
          <div className="sidebar-cta-copy">
            <span className="brand-kicker">Accion principal</span>
            <strong>Crear nuevo tratamiento</strong>
            <p>Inicia el registro guiado desde el modulo operativo principal.</p>
          </div>
          <NavLink to="/actividades/nuevo" className="button-sidebar-primary">
            <AppIcon name="new" size={16} strokeWidth={2.15} />
            Nuevo tratamiento
          </NavLink>
        </div>
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
        <div className="mobile-topbar">
          <div className="mobile-topbar-brand">
            <div className="brand-mark">R</div>
            <div>
              <span className="brand-kicker">Privacidad institucional</span>
              <strong>DNSIPD</strong>
            </div>
          </div>

          <button
            type="button"
            className="button-secondary mobile-topbar-toggle"
            aria-expanded={isSidebarOpen}
            onClick={() => setIsSidebarOpen((current) => !current)}
          >
            {isSidebarOpen ? "Cerrar menu" : "Menu"}
          </button>
        </div>

        <Outlet />
      </main>
    </div>
  );
}
