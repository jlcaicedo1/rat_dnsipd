import { useEffect, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { useNavigate } from "react-router-dom";
import iessLogo from "../assets/iess-logo.png";
import { useAuthStore } from "../features/auth/auth-store";
import { getRoleCapabilities } from "../features/auth/permissions";
import { NotificationBell } from "../features/notifications/NotificationBell";

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function formatTime(d: Date) {
  return d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatDate(d: Date) {
  return `${DAYS_ES[d.getDay()]}, ${d.getDate()} ${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
}

function getInitials(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
}

type TopNavProps = {
  onMobileMenuToggle: () => void;
};

export function TopNav({ onMobileMenuToggle }: TopNavProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const cap = getRoleCapabilities(user?.role);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  const initials = getInitials(user?.nombre ?? "");

  return (
    <header className="top-nav">
      <div className="top-nav-left">
        <button
          type="button"
          className="top-nav-mobile-toggle"
          aria-label="Abrir menu lateral"
          onClick={onMobileMenuToggle}
        >
          <Menu size={20} strokeWidth={2.2} />
        </button>
        <div className="top-nav-brand">
          <img src={iessLogo} alt="IESS" className="top-nav-logo" />
          <span className="top-nav-brand-label">RAT · DNSIPD</span>
        </div>
      </div>

      <div className="top-nav-right">
        <div className="top-nav-datetime">
          <span className="top-nav-time">{formatTime(now)}</span>
          <span className="top-nav-date">{formatDate(now)}</span>
        </div>

        <div className="top-nav-divider" aria-hidden="true" />

        <div className="top-nav-user">
          <div className="top-nav-avatar" aria-hidden="true">{initials}</div>
          <div className="top-nav-user-info">
            <strong>{user?.nombre ?? "Usuario"}</strong>
            <small>{cap.label}</small>
          </div>
        </div>

        <NotificationBell />

        <button
          type="button"
          className="top-nav-logout"
          title="Cerrar sesion"
          onClick={handleLogout}
        >
          <LogOut size={14} strokeWidth={2.3} />
          <span className="top-nav-logout-text">Salir</span>
        </button>
      </div>
    </header>
  );
}
