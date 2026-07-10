import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AppIcon, type AppIconName } from "../components/AppIcon";
import { TopNav } from "../components/TopNav";
import { useAuthStore } from "../features/auth/auth-store";
import { canAccessModule, getRoleCapabilities } from "../features/auth/permissions";
import iessLogo from "../assets/iess-logo.png"; // kept for print-header only

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
      { to: "/eipd/evaluacion", label: "EIPD", icon: "eipd-form" },
      { to: "/checklist-dpd", label: "Diseño Defecto", icon: "checklist" },
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
      { to: "/admin/importar", label: "Importar Matriz RAT", icon: "import-rat" },
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.localStorage.getItem("rat_dnsipd_sidebar_collapsed") === "true";
  });
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
    document.documentElement.style.setProperty(
      "--sidebar-w",
      isSidebarCollapsed ? "84px" : "296px",
    );
  }, [isSidebarCollapsed]);

  const shellClassName = [
    "app-shell",
    isSidebarOpen ? "app-shell-mobile-open" : "",
    isSidebarCollapsed ? "app-shell-sidebar-collapsed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <TopNav onMobileMenuToggle={() => setIsSidebarOpen((v) => !v)} />
    <div className={shellClassName}>
      <button
        type="button"
        className={isSidebarOpen ? "sidebar-overlay sidebar-overlay-visible" : "sidebar-overlay"}
        aria-label="Cerrar menu"
        onClick={() => setIsSidebarOpen(false)}
      />

      <aside className="sidebar">
        <div className="sidebar-header">
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
      </aside>
      <main className="content">
        <div className="print-header" aria-hidden="true">
          <img src={iessLogo} alt="IESS — Instituto Ecuatoriano de Seguridad Social" />
          <div className="print-header-text">
            <strong>Instituto Ecuatoriano de Seguridad Social</strong>
            <small>Direccion Nacional de Tecnologias de la Informacion · Sistema de Proteccion de Datos</small>
          </div>
        </div>

        <Outlet />
      </main>
    </div>
    </>
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
    case "/eipd/evaluacion":
      return "eipd-form";
    case "/checklist-dpd":
      return "checklist-dpd";
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
    case "/admin/importar":
      return "import-rat";
    default:
      return "dashboard";
  }
}
