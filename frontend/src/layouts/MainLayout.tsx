import { useEffect, useState } from "react";
import { LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppIcon, type AppIconName } from "../components/AppIcon";
import { useAuthStore } from "../features/auth/auth-store";
import { canAccessModule, getRoleCapabilities } from "../features/auth/permissions";

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
      { to: "/usuarios", label: "Usuarios", icon: "users" },
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("rat_dnsipd_sidebar_collapsed") === "true";
  });
  const roleCapabilities = getRoleCapabilities(user?.role);
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => canAccessModule(user?.role, mapModuleFromRoute(item.to))),
    }))
    .filter((section) => section.items.length > 0);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    window.localStorage.setItem(
      "rat_dnsipd_sidebar_collapsed",
      String(isSidebarCollapsed),
    );
  }, [isSidebarCollapsed]);

  function handleLogout() {
    setIsSidebarOpen(false);
    logout();
    navigate("/login", { replace: true });
  }

  const shellClassName = [
    "app-shell",
    isSidebarOpen ? "app-shell-mobile-open" : "",
    isSidebarCollapsed ? "app-shell-sidebar-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName}>
      <button
        type="button"
        className={isSidebarOpen ? "sidebar-overlay sidebar-overlay-visible" : "sidebar-overlay"}
        aria-label="Cerrar menu"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-brand-text">
            <strong>DNSIPD</strong>
          </div>
          <button
            type="button"
            className="sidebar-collapse-button"
            aria-label={isSidebarCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
            title={isSidebarCollapsed ? "Expandir" : "Contraer"}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen size={18} strokeWidth={2.2} />
            ) : (
              <PanelLeftClose size={18} strokeWidth={2.2} />
            )}
          </button>
        </div>
        <nav className="nav">
          {visibleSections.map((section) => (
            <div key={section.title} className="nav-section">
              <span className="nav-section-title">{section.title}</span>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    isActive ? "nav-link nav-link-active" : "nav-link"
                  }
                  title={item.label}
                >
                  <span className="nav-link-content">
                    <span className="nav-link-icon">
                      <AppIcon name={item.icon} size={17} strokeWidth={2.1} />
                    </span>
                    <span className="nav-link-label">{item.label}</span>
                  </span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-session">
            <span className="sidebar-user-label">Sesion</span>
            <strong>{user?.nombre ?? "Usuario"}</strong>
            <small>{roleCapabilities.label}</small>
          </div>
          <button
            type="button"
            className="button-ghost sidebar-logout-button"
            title="Cambiar usuario"
            onClick={handleLogout}
          >
            <LogOut size={16} strokeWidth={2.2} />
            <span className="sidebar-logout-text">Cambiar usuario</span>
          </button>
        </div>
      </aside>
      <main className="content">
        <div className="mobile-topbar">
          <div className="mobile-topbar-brand">
            <strong>DNSIPD</strong>
          </div>

          <div className="mobile-topbar-actions">
            <button type="button" className="button-ghost" onClick={handleLogout}>
              Salir
            </button>
            <button
              type="button"
              className="button-secondary mobile-topbar-toggle"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen((current) => !current)}
            >
              {isSidebarOpen ? "Cerrar menu" : "Menu"}
            </button>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
  );
}

function mapModuleFromRoute(route: string) {
  switch (route) {
    case "/dashboard":
      return "dashboard";
    case "/actividades":
      return "activities";
    case "/activos":
      return "assets";
    case "/mtge":
      return "mtge";
    case "/riesgos":
      return "risks";
    case "/eipd":
      return "eipd";
    case "/reportes":
      return "reports";
    case "/audit":
      return "audit";
    case "/catalogos":
      return "catalogs";
    case "/estructura-organica":
      return "organization";
    case "/usuarios":
      return "users";
    default:
      return "dashboard";
  }
}
