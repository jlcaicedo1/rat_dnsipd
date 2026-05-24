import type { AuthUser } from "./auth-storage";
import { normalizeAppRole } from "./permissions";

export type DependencyScopeEntity = {
  id: number;
  nombre: string;
  sigla?: string | null;
};

export type DependencyScopedRecord = {
  codigo?: string | null;
  dependencia?: string | null;
  ratCodigo?: string | null;
};

export function shouldRestrictToAssignedDependency(user?: AuthUser | null) {
  return normalizeAppRole(user?.role) === "OPERADOR";
}

export function getAssignedDependencyScope(
  user: AuthUser | null | undefined,
  dependencies: DependencyScopeEntity[],
) {
  if (!shouldRestrictToAssignedDependency(user) || !user?.dependenciaId) {
    return null;
  }

  return dependencies.find((item) => item.id === user.dependenciaId) ?? null;
}

export function matchesAssignedDependencyScope(
  record: DependencyScopedRecord,
  scope: DependencyScopeEntity | null,
) {
  if (!scope) {
    return false;
  }

  const normalizedDependency = normalizeScopeText(record.dependencia);
  const normalizedScopeName = normalizeScopeText(scope.nombre);
  const normalizedSigla = normalizeScopeText(scope.sigla);
  const normalizedCode = normalizeScopeText(record.codigo);
  const normalizedRatCode = normalizeScopeText(record.ratCodigo);

  return (
    normalizedDependency === normalizedScopeName ||
    (normalizedSigla.length > 0 &&
      (normalizedRatCode.startsWith(`rat-${normalizedSigla}`) ||
        normalizedCode.startsWith(`act-${normalizedSigla}`)))
  );
}

export function formatDependencyScope(scope: DependencyScopeEntity | null) {
  if (!scope) {
    return "Dependencia no asignada";
  }

  return scope.sigla ? `${scope.nombre} (${scope.sigla})` : scope.nombre;
}

function normalizeScopeText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}
