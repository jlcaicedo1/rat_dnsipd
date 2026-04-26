import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { RequireAuth } from "../features/auth/RequireAuth";
import { AuditLogPage } from "../features/audit/AuditLogPage";
import { ActivitiesPage } from "../features/activities-page/ActivitiesPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { RatListPage } from "../features/rat/RatListPage";
import { RatCreatePage } from "../features/rat/RatCreatePage";
import { ModulePage } from "../features/modules/ModulePage";
import { OrganizationStructurePage } from "../features/organization/OrganizationStructurePage";

const modulePages = [
  {
    path: "activos",
    eyebrow: "Inventario",
    title: "Activos de informacion",
    description:
      "Registro de aplicaciones, bases de datos, repositorios documentales, responsables, clasificacion y ciclo de vida.",
    status: "MVP planificado",
    scope: [
      "Mapa de activos asociados a actividades de tratamiento.",
      "Clasificacion de informacion y criticidad institucional.",
      "Dependencia responsable, custodio y relacion con riesgos.",
    ],
    metrics: [
      { label: "Activos", value: "0" },
      { label: "Criticos", value: "0" },
      { label: "Sin responsable", value: "0" },
    ],
  },
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
    metrics: [
      { label: "Evaluaciones", value: "0" },
      { label: "En proceso", value: "0" },
      { label: "Cerradas", value: "0" },
    ],
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
    metrics: [
      { label: "Riesgos", value: "0" },
      { label: "Altos", value: "0" },
      { label: "Tratamiento", value: "0" },
    ],
  },
  {
    path: "eipd",
    eyebrow: "Privacidad",
    title: "EIPD",
    description:
      "Evaluacion de impacto de proteccion de datos para tratamientos de alto riesgo o datos sensibles.",
    status: "MVP planificado",
    scope: [
      "Criterios de necesidad, proporcionalidad y legitimidad.",
      "Riesgos para titulares y medidas de mitigacion.",
      "Dictamen, aprobacion y versionamiento documental.",
    ],
    metrics: [
      { label: "EIPD", value: "0" },
      { label: "Pendientes", value: "0" },
      { label: "Aprobadas", value: "0" },
    ],
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
    metrics: [
      { label: "Reportes", value: "0" },
      { label: "Programados", value: "0" },
      { label: "Exportados", value: "0" },
    ],
  },
  {
    path: "catalogos",
    eyebrow: "Parametros",
    title: "Catalogos",
    description:
      "Administracion de bases de licitud, tipos de activo, clasificacion, titulares, categorias y listas de control.",
    status: "Base cargada",
    scope: [
      "Catalogos normalizados por tipo y codigo unico.",
      "Estados activo/inactivo para preservar historico.",
      "Uso transversal en RAT, actividades, activos y evaluaciones.",
    ],
    metrics: [
      { label: "Tipos", value: "3" },
      { label: "Items", value: "3" },
      { label: "Activos", value: "3" },
    ],
  },
];

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<RequireAuth />}>
        <Route element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="rats" element={<RatListPage />} />
          <Route path="rats/new" element={<RatCreatePage />} />
          <Route path="actividades" element={<ActivitiesPage />} />
          <Route path="estructura-organica" element={<OrganizationStructurePage />} />
          <Route path="audit" element={<AuditLogPage />} />
          {modulePages.map((page) => (
            <Route
              key={page.path}
              path={page.path}
              element={
                <ModulePage
                  eyebrow={page.eyebrow}
                  title={page.title}
                  description={page.description}
                  status={page.status}
                  scope={page.scope}
                  metrics={page.metrics}
                />
              }
            />
          ))}
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
