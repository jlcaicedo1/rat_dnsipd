import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AppIcon } from "../../components/AppIcon";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";

type UserRole = "OPERADOR" | "REVISOR" | "ADMIN_FUNCIONAL" | "ADMIN_TECNICO";

type DependenciaOption = {
  id: number;
  nombre: string;
  sigla?: string | null;
};

type UserRecord = {
  id: number;
  nombre: string;
  email: string;
  username: string;
  role: UserRole | string;
  activo: boolean;
  dependenciaId: number | null;
  subdireccionId: number | null;
  dependencia?: DependenciaOption | null;
  subdireccion?: {
    id: number;
    nombre: string;
    sigla?: string | null;
  } | null;
};

type UserDraft = {
  id: number | null;
  nombre: string;
  email: string;
  username: string;
  password: string;
  role: UserRole;
  dependenciaId: number | null;
  activo: boolean;
};

type UsersResponse = {
  data: UserRecord[];
};

type DependenciasResponse = {
  data: DependenciaOption[];
};

type UserMutationResponse = {
  data: UserRecord;
};

const roleOptions: Array<{ value: UserRole; label: string; scope: string }> = [
  { value: "OPERADOR", label: "Operador", scope: "Dependencia asignada" },
  { value: "REVISOR", label: "Revisor", scope: "Transversal" },
  { value: "ADMIN_FUNCIONAL", label: "Administrador funcional", scope: "Institucional" },
  { value: "ADMIN_TECNICO", label: "Admin tecnico", scope: "Global / tecnico" },
];

export function UserAdminPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"Todos" | UserRole>("Todos");
  const [activeDraft, setActiveDraft] = useState<UserDraft | null>(null);
  const canManageUsers = roleCapabilities.users.save;

  const usersQuery = useQuery({
    queryKey: ["users", "admin"],
    queryFn: async () => {
      const response = await apiClient.get<UsersResponse>("/users");
      return response.data.data;
    },
    enabled: canManageUsers,
  });

  const dependenciasQuery = useQuery({
    queryKey: ["dependencias", "users-admin"],
    queryFn: async () => {
      const response = await apiClient.get<DependenciasResponse>("/dependencias", {
        params: { activo: true },
      });
      return response.data.data;
    },
    enabled: canManageUsers,
  });

  const saveUserMutation = useMutation({
    mutationFn: async (draft: UserDraft) => {
      const dependencyScoped = draft.role === "OPERADOR";
      const payload = {
        nombre: draft.nombre.trim(),
        email: draft.email.trim().toLowerCase(),
        username: draft.username.trim(),
        role: draft.role,
        activo: draft.activo,
        dependenciaId: dependencyScoped ? draft.dependenciaId : null,
        subdireccionId: null,
        ...(draft.password.trim() ? { password: draft.password } : {}),
      };

      if (draft.id) {
        const response = await apiClient.patch<UserMutationResponse>(
          `/users/${draft.id}`,
          payload,
        );

        return response.data.data;
      }

      const response = await apiClient.post<UserMutationResponse>("/users", payload);
      return response.data.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["users", "admin"] });
      setActiveDraft(null);
    },
  });

  const users = usersQuery.data ?? [];
  const dependencias = dependenciasQuery.data ?? [];
  const filteredUsers = useMemo(() => {
    const normalizedSearch = normalize(search);

    return users.filter((item) => {
      const normalizedRole = normalizeRole(item.role);
      const matchesRole = roleFilter === "Todos" || normalizedRole === roleFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        normalize(
          [
            item.nombre,
            item.email,
            item.username,
            getRoleLabel(normalizedRole),
            item.dependencia?.nombre,
            item.dependencia?.sigla,
          ]
            .filter(Boolean)
            .join(" "),
        ).includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [roleFilter, search, users]);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (activeDraft) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeDraft]);

  if (!canManageUsers) {
    return (
      <section className="panel access-panel">
        <span className="brand-kicker">Acceso restringido</span>
        <h2>Administracion de usuarios</h2>
        <p className="page-copy">
          Esta pantalla esta reservada para administracion tecnica.
        </p>
      </section>
    );
  }

  function openCreate() {
    setActiveDraft({
      id: null,
      nombre: "",
      email: "",
      username: "",
      password: "",
      role: "OPERADOR",
      dependenciaId: dependencias[0]?.id ?? null,
      activo: true,
    });
  }

  function openEdit(item: UserRecord) {
    setActiveDraft({
      id: item.id,
      nombre: item.nombre,
      email: item.email,
      username: item.username,
      password: "",
      role: normalizeRole(item.role),
      dependenciaId: item.dependenciaId,
      activo: item.activo,
    });
  }

  return (
    <section className="catalogs-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Seguridad</span>
          <div className="page-title-with-icon">
            <span className="page-title-icon">
              <AppIcon name="users" size={22} strokeWidth={2.1} />
            </span>
            <h2>Administracion de usuarios</h2>
          </div>
        </div>

        <div className="registry-header-actions">
          <button type="button" className="button-primary" onClick={openCreate}>
            Nuevo usuario
          </button>
        </div>
      </header>

      <div className="org-toolbar panel">
        <label className="field">
          <span>Buscar usuario</span>
          <input
            className="input"
            placeholder="Nombre, usuario, correo o dependencia"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <label className="field">
          <span>Rol</span>
          <select
            className="input"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as "Todos" | UserRole)}
          >
            <option value="Todos">Todos</option>
            {roleOptions.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className="panel org-admin-single">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">RBAC / ABAC</span>
            <h3>Usuarios, roles y dependencia asignada</h3>
          </div>
          <span className="pill">{filteredUsers.length} registros filtrados</span>
        </div>

        <TableScrollFrame className="table-wrapper-matrix" maxHeight="69vh">
          <table className="registry-table org-admin-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Alcance</th>
                <th>Dependencia</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => {
                const normalizedRole = normalizeRole(item.role);

                return (
                  <tr
                    key={item.id}
                    className="table-row-interactive"
                    tabIndex={0}
                    aria-haspopup="dialog"
                    onClick={() => openEdit(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openEdit(item);
                      }
                    }}
                  >
                    <td>
                      <strong>{item.nombre}</strong>
                      <small>{item.username} · {item.email}</small>
                    </td>
                    <td>{getRoleLabel(normalizedRole)}</td>
                    <td>{getRoleScope(normalizedRole)}</td>
                    <td>{item.dependencia?.nombre ?? "Transversal"}</td>
                    <td>
                      <span
                        className={
                          item.activo
                            ? "pill status-pill-vigente"
                            : "pill status-pill-archivado"
                        }
                      >
                        {item.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScrollFrame>
      </section>

      {activeDraft ? (
        <UserManagementModal
          dependencias={dependencias}
          draft={activeDraft}
          isSaving={saveUserMutation.isPending}
          onChange={setActiveDraft}
          onClose={() => setActiveDraft(null)}
          onSave={() => saveUserMutation.mutate(activeDraft)}
        />
      ) : null}
    </section>
  );
}

function UserManagementModal({
  dependencias,
  draft,
  isSaving,
  onChange,
  onClose,
  onSave,
}: {
  dependencias: DependenciaOption[];
  draft: UserDraft;
  isSaving: boolean;
  onChange: (draft: UserDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const isCreating = draft.id === null;
  const requiresDependency = draft.role === "OPERADOR";
  const isSaveDisabled =
    draft.nombre.trim().length === 0 ||
    draft.email.trim().length === 0 ||
    draft.username.trim().length === 0 ||
    (isCreating && draft.password.trim().length < 8) ||
    (requiresDependency && !draft.dependenciaId);

  return (
    <div
      className="report-preview-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-management-title"
    >
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar gestion de usuario"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog catalog-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Gestion de usuario</span>
            <div className="page-title-with-icon page-title-with-icon-modal">
              <span className="page-title-icon">
                <AppIcon name="users" size={20} strokeWidth={2.1} />
              </span>
              <h3 id="user-management-title">
                {isCreating ? "Nuevo usuario" : draft.nombre}
              </h3>
            </div>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <div className="catalog-modal-grid">
            <div className="detail-block">
              <h4>Identidad y alcance</h4>
              <div className="catalog-form-grid">
                <label className="field full-width">
                  <span>Nombre</span>
                  <input
                    className="input"
                    value={draft.nombre}
                    onChange={(event) => onChange({ ...draft, nombre: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Usuario</span>
                  <input
                    className="input"
                    value={draft.username}
                    onChange={(event) => onChange({ ...draft, username: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Correo</span>
                  <input
                    className="input"
                    type="email"
                    value={draft.email}
                    onChange={(event) => onChange({ ...draft, email: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Rol</span>
                  <select
                    className="input"
                    value={draft.role}
                    onChange={(event) => {
                      const role = event.target.value as UserRole;

                      onChange({
                        ...draft,
                        role,
                        dependenciaId:
                          role === "OPERADOR"
                            ? draft.dependenciaId ?? dependencias[0]?.id ?? null
                            : null,
                      });
                    }}
                  >
                    {roleOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Dependencia</span>
                  <select
                    className="input"
                    value={draft.dependenciaId ?? ""}
                    disabled={!requiresDependency}
                    onChange={(event) =>
                      onChange({
                        ...draft,
                        dependenciaId: event.target.value ? Number(event.target.value) : null,
                      })
                    }
                  >
                    <option value="">Transversal</option>
                    {dependencias.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.sigla ? `${item.sigla} - ${item.nombre}` : item.nombre}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Clave</span>
                  <input
                    className="input"
                    type="password"
                    placeholder={isCreating ? "Minimo 8 caracteres" : "Sin cambios"}
                    value={draft.password}
                    onChange={(event) => onChange({ ...draft, password: event.target.value })}
                  />
                </label>

                <label className="field">
                  <span>Estado</span>
                  <select
                    className="input"
                    value={draft.activo ? "true" : "false"}
                    onChange={(event) =>
                      onChange({ ...draft, activo: event.target.value === "true" })
                    }
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </label>
              </div>

              <div className="activity-action-modal-actions">
                <button
                  type="button"
                  className="button-table-action"
                  disabled={isSaveDisabled || isSaving}
                  onClick={onSave}
                >
                  {isSaving ? "Guardando..." : "Guardar usuario"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function normalizeRole(role: string): UserRole {
  const normalized = role.trim().toUpperCase();

  if (normalized === "ADMIN" || normalized === "ADMIN_TECNICO") {
    return "ADMIN_TECNICO";
  }

  if (normalized === "ADMIN_FUNCIONAL") {
    return "ADMIN_FUNCIONAL";
  }

  if (
    normalized === "REVISOR" ||
    normalized === "APROBADOR_FUNCIONAL" ||
    normalized.includes("REVIS")
  ) {
    return "REVISOR";
  }

  return "OPERADOR";
}

function getRoleLabel(role: UserRole) {
  return roleOptions.find((item) => item.value === role)?.label ?? role;
}

function getRoleScope(role: UserRole) {
  return roleOptions.find((item) => item.value === role)?.scope ?? "Dependencia";
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
