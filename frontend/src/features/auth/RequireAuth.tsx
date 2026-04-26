import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "./auth-store";

export function RequireAuth() {
  const token = useAuthStore((state) => state.token);
  const hydrated = useAuthStore((state) => state.hydrated);
  const location = useLocation();

  if (!hydrated) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <span className="brand-kicker">Sesion</span>
          <h1>Preparando acceso</h1>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
