import { LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";
import { getRoleCapabilities } from "../features/auth/permissions";
import { NotificationBell } from "../features/notifications/NotificationBell";

function getInitials(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

type TopNavProps = { onMobileMenuToggle: () => void };

export function TopNav({ onMobileMenuToggle }: TopNavProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const cap = getRoleCapabilities(user?.role);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <header className="top-nav">
      <button
        type="button"
        className="top-nav-mobile-toggle"
        aria-label="Abrir menu lateral"
        onClick={onMobileMenuToggle}
      >
        <Menu size={19} strokeWidth={2} />
      </button>

      <div className="top-nav-right">
        <div className="top-nav-user">
          <div className="top-nav-avatar">{getInitials(user?.nombre ?? "")}</div>
          <div className="top-nav-user-info">
            <strong>{user?.nombre ?? "Usuario"}</strong>
            <small>{cap.label}</small>
          </div>
        </div>
        <div className="top-nav-sep" aria-hidden="true" />
        <NotificationBell />
        <button
          type="button"
          className="top-nav-logout"
          title="Cerrar sesion"
          onClick={handleLogout}
        >
          <LogOut size={15} strokeWidth={2.2} />
          <span className="top-nav-logout-text">Salir</span>
        </button>
      </div>
    </header>
  );
}
