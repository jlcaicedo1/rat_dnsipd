import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "./auth-store";

type LoginResponse = {
  data: {
    accessToken: string;
    user: {
      id: number;
      nombre: string;
      email: string;
      username: string;
      role?: string;
      roles?: string[];
      dependenciaId?: number | null;
      subdireccionId?: number | null;
      activo?: boolean;
    };
  };
};

type LocationState = {
  from?: string;
};

const demoAccounts = [
  {
    label: "Administrador tecnico",
    username: "admin",
    password: "Admin1234*",
  },
  {
    label: "Operador DSGSIF",
    username: "operador.dsgsif",
    password: "Operador1234*",
  },
  {
    label: "Revisor",
    username: "revisor",
    password: "Revisor1234*",
  },
  {
    label: "Admin funcional",
    username: "admin.funcional",
    password: "Funcional1234*",
  },
];

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((state) => state.setSession);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("Admin1234*");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const locationState = location.state as LocationState | null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.post<LoginResponse>("/auth/login", {
        username,
        password,
      });

      const { accessToken, user } = response.data.data;

      setSession({
        token: accessToken,
        user: {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          username: user.username,
          role: user.role ?? user.roles?.[0] ?? "ADMIN_TECNICO",
          dependenciaId: user.dependenciaId ?? null,
          subdireccionId: user.subdireccionId ?? null,
          activo: user.activo ?? true,
        },
      });

      navigate(locationState?.from ?? "/dashboard", { replace: true });
    } catch {
      setError("No fue posible iniciar sesion. Revise backend o credenciales.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card auth-form" onSubmit={handleSubmit}>
        <span className="brand-kicker">Acceso institucional</span>
        <h1>Consola RAT y auditoria</h1>
        <p>
          Ingrese con una cuenta valida para revisar trazabilidad, cambios y
          acciones registradas por el sistema.
        </p>

        <label className="field">
          <span>Usuario</span>
          <input
            className="input"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="username"
          />
        </label>

        <label className="field">
          <span>Clave</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" className="button-primary" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando..." : "Ingresar"}
        </button>

        <div className="demo-login-panel">
          <span>Usuarios de prueba</span>
          <div className="demo-login-grid">
            {demoAccounts.map((account) => (
              <button
                key={account.username}
                type="button"
                className="button-ghost demo-login-button"
                onClick={() => {
                  setUsername(account.username);
                  setPassword(account.password);
                  setError(null);
                }}
              >
                {account.label}
              </button>
            ))}
          </div>
        </div>
      </form>
    </div>
  );
}
