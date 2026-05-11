import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ExecutiveKpiGrid,
  type ExecutiveKpiItem,
} from "../../components/ExecutiveKpiGrid";
import { apiClient } from "../../services/api-client";
import { useAuthStore } from "../auth/auth-store";
import {
  canAccessModule,
  getRoleCapabilities,
  type AppModuleKey,
} from "../auth/permissions";
import { getOrganizationUnits } from "../organization/organization-structure-data";
import { getRatRegistryRecords } from "../rat/rat-registry-data";
import { buildRegistryWorkspace } from "../rat/registry-workspace";

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const isOperator = roleCapabilities.role === "OPERADOR";
  const isTechnicalAdmin = roleCapabilities.role === "ADMIN_TECNICO";

  const ratRecords = useMemo(
    () => buildRegistryWorkspace(getRatRegistryRecords()),
    [],
  );
  const organizationUnits = useMemo(() => getOrganizationUnits(), []);

  const dependenciaQuery = useQuery({
    queryKey: ["dashboard", "dependencia", user?.dependenciaId],
    enabled: isOperator && Boolean(user?.dependenciaId),
    queryFn: async () => {
      const dependenciaId = user?.dependenciaId;

      if (!dependenciaId) {
        throw new Error("El usuario no tiene dependencia asignada.");
      }

      const response = await apiClient.get<DashboardDependenciaResponse>(
        `/dependencias/${dependenciaId}`,
      );
      return response.data.data;
    },
  });

  const activosQuery = useQuery({
    queryKey: ["dashboard", "activos"],
    queryFn: async () => {
      const response = await apiClient.get<DashboardAssetsResponse>("/activos");
      return response.data.data;
    },
  });

  const usersQuery = useQuery({
    queryKey: ["dashboard", "users"],
    enabled: isTechnicalAdmin,
    queryFn: async () => {
      const response = await apiClient.get<DashboardUsersResponse>("/users");
      return response.data.data;
    },
  });

  const canOpenActivities = canAccessModule(user?.role, "activities");
  const canOpenAssets = canAccessModule(user?.role, "assets");
  const canOpenOrganization = canAccessModule(user?.role, "organization");
  const canOpenUsers = canAccessModule(user?.role, "users");
  const canOpenCatalogs = canAccessModule(user?.role, "catalogs");
  const canOpenAudit = canAccessModule(user?.role, "audit");

  const dependencyScope = dependenciaQuery.data ?? null;
  const scopedRatRecords = useMemo(() => {
    if (!isOperator) {
      return ratRecords;
    }

    if (!dependencyScope) {
      return [];
    }

    return ratRecords.filter((rat) =>
      matchesDependency(rat.dependencia, dependencyScope),
    );
  }, [dependencyScope, isOperator, ratRecords]);

  const scopedOrganizationUnits = useMemo(() => {
    if (!isOperator) {
      return organizationUnits;
    }

    if (!dependencyScope) {
      return [];
    }

    return organizationUnits.filter((unit) =>
      matchesDependency(unit.nombre, dependencyScope),
    );
  }, [dependencyScope, isOperator, organizationUnits]);

  const activityRecords = useMemo(
    () => scopedRatRecords.flatMap((rat) => rat.activities),
    [scopedRatRecords],
  );
  const scopedRatDependencies = new Set(
    scopedRatRecords.map((rat) => rat.dependencia).filter(Boolean),
  );
  const eipdActivities = activityRecords.filter((item) => item.requiereEipd);
  const eipdRats = scopedRatRecords.filter((item) => item.requiereEipd);
  const highRiskRats = scopedRatRecords.filter((item) => item.riesgo === "Alto");

  const assets = activosQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const criticalAssets = assets.filter(
    (item) => normalizeImpactKey(item) === "CATASTROFICO",
  );
  const criticalAssetDependencies = new Set(
    criticalAssets
      .map((item) => item.dependencia)
      .filter((value): value is string => Boolean(value)),
  );
  const activeDependenciesWithoutRat = scopedOrganizationUnits.filter(
    (unit) =>
      unit.status === "Activa" &&
      !isSubdependency(unit.tipo) &&
      !scopedRatDependencies.has(unit.nombre),
  );

  const dashboardScope = getDashboardScope(roleCapabilities.label, {
    role: roleCapabilities.role,
    dependenciaNombre: dependencyScope?.nombre ?? null,
    dependenciaSigla: dependencyScope?.sigla ?? null,
  });

  const summary = useMemo<ExecutiveKpiItem[]>(() => {
    const scope = dashboardScope.kpiScope;
    const linkTo = (module: AppModuleKey, path: string) =>
      canAccessModule(user?.role, module) ? path : undefined;

    if (isTechnicalAdmin) {
      const activeUsers = users.filter((item) => item.activo).length;
      const inactiveUsers = users.length - activeUsers;

      return [
        {
          label: "Usuarios activos",
          value: activeUsers,
          context: "Cuentas habilitadas",
          scope,
          tone: "neutral",
          to: linkTo("users", "/usuarios"),
        },
        {
          label: "Usuarios inactivos",
          value: inactiveUsers,
          context: "Requieren revision tecnica",
          scope,
          tone: inactiveUsers > 0 ? "warning" : "success",
          to: linkTo("users", "/usuarios?estado=inactivo"),
        },
        {
          label: "Activos registrados",
          value: assets.length,
          context: "Inventario disponible",
          scope,
          tone: "neutral",
          to: linkTo("assets", "/activos"),
        },
        {
          label: "Activos catastroficos",
          value: criticalAssets.length,
          context:
            criticalAssets.length > 0
              ? "Prioridad de continuidad"
              : "Sin exposicion critica",
          scope,
          tone: criticalAssets.length > 0 ? "critical" : "success",
          emphasize: criticalAssets.length > 0,
          to: linkTo("assets", "/activos?impacto=CATASTROFICO"),
        },
        {
          label: "Dependencias registradas",
          value: organizationUnits.filter((unit) => !isSubdependency(unit.tipo)).length,
          context: "Estructura base",
          scope,
          tone: "neutral",
          to: linkTo("organization", "/estructura-organica"),
        },
      ];
    }

    if (isOperator) {
      return [
        {
          label: "Actividades dependencia",
          value: scopedRatRecords.length,
          context: "Registros bajo su ambito",
          scope,
          tone: "neutral",
          to: linkTo("activities", "/actividades"),
        },
        {
          label: "Activos dependencia",
          value: assets.length,
          context: "Inventario visible",
          scope,
          tone: "neutral",
          to: linkTo("assets", "/activos"),
        },
        {
          label: "RAT con EIPD",
          value: eipdRats.length,
          context: "Privacidad en seguimiento",
          scope,
          tone: eipdRats.length > 0 ? "orange" : "neutral",
          to: linkTo("activities", "/actividades?eipd=Si"),
        },
        {
          label: "Riesgo alto",
          value: highRiskRats.length,
          context: "Atencion prioritaria",
          scope,
          tone: highRiskRats.length > 0 ? "critical" : "success",
          emphasize: highRiskRats.length > 0,
          to: linkTo("activities", "/actividades?riesgo=Alto"),
        },
        {
          label: "Activos catastroficos",
          value: criticalAssets.length,
          context:
            criticalAssets.length > 0
              ? "Continuidad comprometida"
              : "Sin exposicion critica",
          scope,
          tone: criticalAssets.length > 0 ? "critical" : "success",
          emphasize: criticalAssets.length > 0,
          to: linkTo("assets", "/activos?impacto=CATASTROFICO"),
        },
      ];
    }

    return [
      {
        label: "Dependencias con RAT",
        value: scopedRatDependencies.size,
        scope,
        tone: "neutral",
        to: linkTo("organization", "/estructura-organica?uso=con-rat"),
      },
      {
        label: "Activos de informacion",
        value: assets.length,
        scope,
        tone: "neutral",
        to: linkTo("assets", "/activos"),
      },
      {
        label: "RAT con EIPD",
        value: eipdRats.length,
        scope,
        tone: eipdRats.length > 0 ? "orange" : "neutral",
        to: linkTo("activities", "/actividades?eipd=Si"),
      },
      {
        label: "Dependencias sin RAT",
        value: activeDependenciesWithoutRat.length,
        context: "Cobertura institucional pendiente.",
        scope,
        tone: activeDependenciesWithoutRat.length > 0 ? "warning" : "success",
        to: linkTo("organization", "/estructura-organica?uso=sin-uso"),
      },
      {
        label: "Activos catastroficos",
        value: criticalAssets.length,
        context:
          criticalAssets.length > 0
            ? `${criticalAssetDependencies.size} dependencias comprometidas`
            : "Sin exposicion critica reportada.",
        scope,
        tone: criticalAssets.length > 0 ? "critical" : "success",
        emphasize: criticalAssets.length > 0,
        to: linkTo("assets", "/activos?impacto=CATASTROFICO"),
      },
    ];
  }, [
    activeDependenciesWithoutRat.length,
    assets.length,
    criticalAssetDependencies.size,
    criticalAssets.length,
    dashboardScope.kpiScope,
    eipdRats.length,
    highRiskRats.length,
    isOperator,
    isTechnicalAdmin,
    organizationUnits,
    scopedRatDependencies.size,
    scopedRatRecords.length,
    user?.role,
    users,
  ]);

  const priorityRecords = scopedRatRecords
    .filter((item) => item.riesgo === "Alto" || item.requiereEipd)
    .slice(0, 4);
  const pendingDependencies = activeDependenciesWithoutRat.slice(0, 4);
  const technicalRoleCounts = users.reduce<Record<string, number>>((acc, item) => {
    const label = getRoleCapabilities(item.role).label;
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});
  const technicalQuickLinks = [
    canOpenUsers
      ? {
          to: "/usuarios",
          title: "Usuarios y roles",
          description: "Crear, activar, desactivar y asignar dependencia.",
        }
      : null,
    canOpenCatalogs
      ? {
          to: "/catalogos",
          title: "Catalogos y parametros",
          description: "Gobierno de referencias y configuracion funcional.",
        }
      : null,
    canOpenAudit
      ? {
          to: "/audit",
          title: "Auditoria",
          description: "Trazabilidad tecnica de acciones del sistema.",
        }
      : null,
  ].filter((item): item is DashboardQuickLink => Boolean(item));

  return (
    <section className="dashboard-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Vista general</span>
          <h2>Dashboard institucional</h2>
          <p className="page-copy">
            {dashboardScope.description}
          </p>
        </div>

        {canOpenActivities ? (
          <div className="registry-header-actions">
            <Link to="/actividades" className="button-primary">
              Ir a tratamientos
            </Link>
          </div>
        ) : null}
      </header>

      <ExecutiveKpiGrid items={summary} />

      {isTechnicalAdmin ? (
        <TechnicalDashboardPanels
          criticalAssets={criticalAssets}
          quickLinks={technicalQuickLinks}
          roleCounts={technicalRoleCounts}
          canOpenAssets={canOpenAssets}
          canOpenOrganization={canOpenOrganization}
        />
      ) : (
        <div className="dashboard-grid">
          <section className="panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <span className="brand-kicker">Prioridad institucional</span>
                <h3>Tratamientos con mayor exposicion</h3>
              </div>
              {canOpenActivities ? (
                <Link to="/actividades" className="pill">
                  Ver modulo
                </Link>
              ) : null}
            </div>

            <div className="dashboard-list">
              {priorityRecords.length > 0 ? (
                priorityRecords.map((item) => (
                  <article key={item.id} className="dashboard-list-item">
                    <div>
                      <strong>{item.codigo}</strong>
                      <span>{item.nombre}</span>
                    </div>
                    <div className="dashboard-list-meta">
                      <span className={`pill risk-pill-${normalizeToken(item.riesgo)}`}>
                        {item.riesgo}
                      </span>
                      <span
                        className={
                          item.requiereEipd
                            ? "pill eipd-pill-yes"
                            : "pill eipd-pill-no"
                        }
                      >
                        {item.requiereEipd ? "EIPD Si" : "EIPD No"}
                      </span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="selection-action-empty">
                  Sin tratamientos prioritarios para el alcance actual.
                </p>
              )}
            </div>
          </section>

          {!isOperator ? (
            <section className="panel dashboard-panel">
              <div className="panel-heading">
                <div>
                  <span className="brand-kicker">Dependencias sin cobertura</span>
                  <h3>Dependencias pendientes de levantar</h3>
                </div>
                {canOpenOrganization ? (
                  <Link to="/estructura-organica?uso=sin-uso" className="pill">
                    Ver dependencias
                  </Link>
                ) : null}
              </div>

              <div className="dashboard-list">
                {pendingDependencies.length > 0 ? (
                  pendingDependencies.map((item) => (
                    <article key={item.id} className="dashboard-list-item">
                      <div>
                        <strong>{item.nombre}</strong>
                        <span>{item.tipo}</span>
                      </div>
                      <div className="dashboard-list-meta">
                        <span className="pill status-pill-borrador">Sin RAT</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="selection-action-empty">
                    No hay dependencias pendientes en el alcance actual.
                  </p>
                )}
              </div>
            </section>
          ) : null}

          <section className="panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <span className="brand-kicker">EIPD y privacidad</span>
                <h3>Tratamientos que exigen atencion</h3>
              </div>
              <span className="pill">{eipdActivities.length} casos</span>
            </div>

            <div className="dashboard-list">
              {eipdActivities.length > 0 ? (
                eipdActivities.slice(0, 4).map((item) => (
                  <article key={item.id} className="dashboard-list-item">
                    <div>
                      <strong>{item.nombre}</strong>
                      <span>{item.dependencia}</span>
                    </div>
                    <div className="dashboard-list-meta">
                      <span className="pill eipd-pill-yes">EIPD Si</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="selection-action-empty">
                  Sin expedientes EIPD pendientes para este alcance.
                </p>
              )}
            </div>
          </section>

          <section className="panel dashboard-panel">
            <div className="panel-heading">
              <div>
                <span className="brand-kicker">Accesos rapidos</span>
                <h3>Flujos principales</h3>
              </div>
            </div>

            <div className="dashboard-links">
              {canOpenActivities ? (
                <Link to="/actividades" className="dashboard-link-card">
                  <strong>Actividades de tratamiento</strong>
                  <span>
                    Bandeja operativa con riesgo, version, trazabilidad y salida documental.
                  </span>
                </Link>
              ) : null}
              {canOpenActivities && roleCapabilities.activities.create ? (
                <Link to="/actividades/nuevo" className="dashboard-link-card">
                  <strong>Nuevo tratamiento</strong>
                  <span>Ingreso guiado por etapas con progreso del registro visible.</span>
                </Link>
              ) : null}
              {canOpenAssets ? (
                <Link to="/activos" className="dashboard-link-card">
                  <strong>Activos de informacion</strong>
                  <span>
                    Inventario de soporte para relacionar activos, riesgos y tratamientos.
                  </span>
                </Link>
              ) : null}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}

function TechnicalDashboardPanels({
  criticalAssets,
  quickLinks,
  roleCounts,
  canOpenAssets,
  canOpenOrganization,
}: {
  criticalAssets: DashboardAsset[];
  quickLinks: DashboardQuickLink[];
  roleCounts: Record<string, number>;
  canOpenAssets: boolean;
  canOpenOrganization: boolean;
}) {
  return (
    <div className="dashboard-grid">
      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <span className="brand-kicker">Seguridad y acceso</span>
            <h3>Usuarios por rol</h3>
          </div>
          {quickLinks.some((item) => item.to === "/usuarios") ? (
            <Link to="/usuarios" className="pill">
              Administrar
            </Link>
          ) : null}
        </div>

        <div className="dashboard-list">
          {Object.entries(roleCounts).map(([role, total]) => (
            <article key={role} className="dashboard-list-item">
              <div>
                <strong>{role}</strong>
                <span>Usuarios asignados</span>
              </div>
              <div className="dashboard-list-meta">
                <span className="pill status-pill-en-revision">{total}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <span className="brand-kicker">Continuidad tecnica</span>
            <h3>Activos con exposicion critica</h3>
          </div>
          {canOpenAssets ? (
            <Link to="/activos?impacto=CATASTROFICO" className="pill">
              Ver activos
            </Link>
          ) : null}
        </div>

        <div className="dashboard-list">
          {criticalAssets.length > 0 ? (
            criticalAssets.slice(0, 4).map((item) => (
              <article key={item.id} className="dashboard-list-item">
                <div>
                  <strong>{item.nombre ?? `Activo ${item.id}`}</strong>
                  <span>{item.dependencia ?? "Sin dependencia asociada"}</span>
                </div>
                <div className="dashboard-list-meta">
                  <span className="pill impact-pill-catastrofico">Catastrofico</span>
                </div>
              </article>
            ))
          ) : (
            <p className="selection-action-empty">
              No hay activos catastroficos registrados.
            </p>
          )}
        </div>
      </section>

      <section className="panel dashboard-panel">
        <div className="panel-heading">
          <div>
            <span className="brand-kicker">Administracion tecnica</span>
            <h3>Flujos habilitados</h3>
          </div>
        </div>

        <div className="dashboard-links">
          {quickLinks.map((item) => (
            <Link key={item.to} to={item.to} className="dashboard-link-card">
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </Link>
          ))}
          {canOpenOrganization ? (
            <Link to="/estructura-organica" className="dashboard-link-card">
              <strong>Estructura organica</strong>
              <span>Dependencias y subdirecciones disponibles para scoping.</span>
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function getDashboardScope(
  roleLabel: string,
  input: {
    role: string;
    dependenciaNombre: string | null;
    dependenciaSigla: string | null;
  },
) {
  if (input.role === "OPERADOR") {
    const dependencia =
      input.dependenciaSigla ?? input.dependenciaNombre ?? "dependencia asignada";

    return {
      kpiScope: `${roleLabel} / ${dependencia}`,
      description:
        "KPI calculados solo para la dependencia asociada a la sesion activa.",
    };
  }

  if (input.role === "ADMIN_TECNICO") {
    return {
      kpiScope: `${roleLabel} / soporte global`,
      description:
        "Lectura tecnica de usuarios, seguridad, inventario y configuracion del sistema.",
    };
  }

  return {
    kpiScope: `${roleLabel} / alcance institucional`,
    description:
      "Lectura ejecutiva transversal de cobertura, exposicion critica y tratamientos prioritarios.",
  };
}

function matchesDependency(
  value: string | null | undefined,
  dependency: DashboardDependencia | null,
) {
  if (!value || !dependency) {
    return false;
  }

  const normalizedValue = normalizeComparable(value);
  const candidates = [dependency.nombre, dependency.sigla]
    .filter((item): item is string => Boolean(item))
    .map(normalizeComparable);

  return candidates.some(
    (candidate) =>
      normalizedValue === candidate ||
      normalizedValue.includes(candidate) ||
      candidate.includes(normalizedValue),
  );
}

function isSubdependency(tipo: string) {
  return normalizeToken(tipo).includes("subdireccion");
}

type DashboardDependencia = {
  id: number;
  nombre: string;
  sigla: string | null;
};

type DashboardDependenciaResponse = {
  data: DashboardDependencia;
};

type DashboardAsset = {
  id: number;
  nombre?: string | null;
  dependencia: string | null;
  impacto: string | null;
  impactoCodigo?: string | null;
};

type DashboardAssetsResponse = {
  data: DashboardAsset[];
};

type DashboardUsersResponse = {
  data: Array<{
    id: number;
    role: string;
    activo: boolean;
  }>;
};

type DashboardQuickLink = {
  to: string;
  title: string;
  description: string;
};

function normalizeImpactKey(item: {
  impacto: string | null;
  impactoCodigo?: string | null;
}) {
  const normalizedCode = item.impactoCodigo?.trim().toUpperCase();

  if (normalizedCode === "CATASTROFICO" || normalizedCode === "CATASTRÓFICO") {
    return "CATASTROFICO";
  }

  const normalizedLabel = normalizeToken(item.impacto ?? "");

  switch (normalizedLabel) {
    case "menor":
      return "MENOR";
    case "moderado":
      return "MODERADO";
    case "mayor":
      return "MAYOR";
    case "catastrofico":
      return "CATASTROFICO";
    default:
      return null;
  }
}

function normalizeComparable(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}
