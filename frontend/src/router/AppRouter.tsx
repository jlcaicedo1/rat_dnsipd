import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuthStore } from "../features/auth/auth-store";
import { canAccessModule, type AppModuleKey } from "../features/auth/permissions";
import { MainLayout } from "../layouts/MainLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { AuditLogPage } from "../features/audit/AuditLogPage";
import { ActivitiesPage } from "../features/activities-page/ActivitiesPage";
import { AssetsPage } from "../features/assets/AssetsPage";
import { AssetCatalogsPage } from "../features/catalogs/AssetCatalogsPage";
import { CatalogsPage } from "../features/catalogs/CatalogsPage";
import type { ExecutiveKpiItem } from "../components/ExecutiveKpiGrid";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EipdPage } from "../features/eipd/EipdPage";
import { RatCreatePage } from "../features/rat/RatCreatePage";
import { ModulePage } from "../features/modules/ModulePage";
import { OrganizationStructurePage } from "../features/organization/OrganizationStructurePage";
import { UserAdminPage } from "../features/users/UserAdminPage";

const modulePages: Array<{
  path: string;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  scope: string[];
  metrics: ExecutiveKpiItem[];
}> = [
  {
    path: "mtge",
    eyebrow: "MTGE",
    title: "Evaluacion MTGE",
    description:
      "Evaluacion metodologica para identificar obligaciones, brechas, controles y evidencias por actividad.",
    status: "MVP planificado",
    scope: [
      "Cuestionarios por version de actividad y responsable.",
      "Resultado consolidado por dominio de control.",
      "Evidencias y observaciones para auditoria.",
    ],
    metrics: [],
  },
  {
    path: "riesgos",
    eyebrow: "Riesgos",
    title: "Evaluacion de riesgos",
    description:
      "Registro de escenarios de riesgo, probabilidad, impacto, nivel inherente, controles y riesgo residual.",
    status: "MVP planificado",
    scope: [
      "Matriz de riesgo por RAT, actividad y activo.",
      "Tratamientos, responsables y fechas de seguimiento.",
      "Semaforizacion para priorizar riesgos altos y criticos.",
    ],
    metrics: [],
  },
  {
    path: "reportes",
    eyebrow: "Reporteria",
    title: "Reportes",
    description:
      "Salidas ejecutivas y operativas para seguimiento de RAT, activos, riesgos, EIPD y auditoria.",
    status: "MVP planificado",
    scope: [
      "Reporte general RAT por dependencia y estado.",
      "Mapa de riesgos y actividades con EIPD requerida.",
      "Exportables para auditoria y comites de seguimiento.",
    ],
    metrics: [],
  },
];

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<ModuleAccessGate module="dashboard"><DashboardPage /></ModuleAccessGate>} />
          <Route path="actividades" element={<ModuleAccessGate module="activities"><ActivitiesPage /></ModuleAccessGate>} />
          <Route path="actividades/nuevo" element={<RatCreatePage />} />
          <Route path="activos" element={<ModuleAccessGate module="assets"><AssetsPage /></ModuleAccessGate>} />
          <Route path="eipd" element={<ModuleAccessGate module="eipd"><EipdPage /></ModuleAccessGate>} />
          <Route path="rats" element={<ModuleAccessGate module="activities"><ActivitiesPage /></ModuleAccessGate>} />
          <Route path="rats/new" element={<RatCreatePage />} />
          <Route
            path="estructura-organica"
            element={
              <ModuleAccessGate module="organization">
                <OrganizationStructurePage />
              </ModuleAccessGate>
            }
          />
          <Route
            path="usuarios"
            element={
              <ModuleAccessGate module="users">
                <UserAdminPage />
              </ModuleAccessGate>
            }
          />
          <Route
            path="audit"
            element={
              <ModuleAccessGate module="audit">
                <AuditLogPage />
              </ModuleAccessGate>
            }
          />
          <Route
            path="catalogos"
            element={
              <ModuleAccessGate module="catalogs">
                <CatalogsPage />
              </ModuleAccessGate>
            }
          />
          <Route
            path="catalogos/activos"
            element={
              <ModuleAccessGate module="catalogs">
                <AssetCatalogsPage />
              </ModuleAccessGate>
            }
          />
          {modulePages.map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={
                <ModuleAccessGate module={page.path as AppModuleKey}>
                  <ModulePage
                    eyebrow={page.eyebrow}
                    title={page.title}
                    description={page.description}
                    status={page.status}
                    scope={page.scope}
                    metrics={page.metrics}
                  />
                </ModuleAccessGate>
              }
            />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function ModuleAccessGate({
  children,
  module,
}: {
  children: ReactNode;
  module: AppModuleKey;
}) {
  const user = useAuthStore((state) => state.user);

  if (!canAccessModule(user?.role, module)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
