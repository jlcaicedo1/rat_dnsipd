import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ExecutiveKpiGrid, type ExecutiveKpiItem } from "../../components/ExecutiveKpiGrid";
import { TableScrollFrame } from "../../components/TableScrollFrame";
import { apiClient } from "../../services/api-client";
import {
  formatDependencyScope,
  getAssignedDependencyScope,
  matchesAssignedDependencyScope,
  shouldRestrictToAssignedDependency,
  type DependencyScopeEntity,
} from "../auth/dependency-scope";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import {
  defaultSignatureFields,
  getActivityTraceability,
  getRatRegistryRecords,
  getRiskOptions,
  getRatStatusOptions,
  type ActivityRegistryRecord,
  type ActivityTraceabilityAsset,
  type ActivityTraceabilityModel,
  type RecordStatus,
  type RiskLevel,
  type SignatureFieldState,
} from "../rat/rat-registry-data";
import {
  buildRegistryWorkspace,
  persistActivityStatus,
} from "../rat/registry-workspace";
import { ReportPreviewModal } from "../rat/ReportPreviewModal";
import {
  buildReportDocument,
  printReportDocument,
} from "../rat/TreatmentReportPreview";
import { seedTreatmentDraftFromActivity } from "../rat/treatment-draft-storage";
import { ActivityMapModal } from "./ActivityMapModal";
import { ArchiveConfirmModal } from "./ArchiveConfirmModal";
import { ConfirmWithMotivoModal } from "../../components/ConfirmWithMotivoModal";

type DependenciasResponse = {
  data: DependencyScopeEntity[];
};

type BackendActivity = {
  id: number;
  ratId: number;
  codigo: string;
  nombre: string;
  ratCodigo: string;
  rat: string;
  dependencia: string;
  subdireccion: string | null;
  macroproceso: string | null;
  proceso: string | null;
  subproceso: string | null;
  versionActualId: number | null;
  versionActual: string | null;
  estadoGeneral: string;
  estadoVersionActual: string | null;
  finalidad: string | null;
  plazoConservacion: string | null;
  baseLicitud: string | null;
  normaAplicable: string | null;
  categoriasDatos: unknown;
  categoriasTitulares: string | null;
  accionesTratamiento: unknown;
  origenDatos: string | null;
  medidaSeguridad: string | null;
  requiereEipd: boolean;
  fechaLevantamiento: string | null;
};

type BackendActivo = {
  id: number;
  activo: {
    id: number;
    nombre: string;
    custodio: string | null;
    areaCustodio: string | null;
    unidadPropietariaActivo: string | null;
    direccionIpUrl: string | null;
    tipoActivo: { nombre: string } | null;
    impacto: { nombre: string } | null;
  };
};

export function ActivitiesPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const roleCapabilities = getRoleCapabilities(user?.role);
  const restrictToAssignedDependency = shouldRestrictToAssignedDependency(user);
  const [workspaceVersion, setWorkspaceVersion] = useState(0);
  const dependenciasQuery = useQuery({
    queryKey: ["dependencias", "activities-scope"],
    queryFn: async () => {
      const response = await apiClient.get<DependenciasResponse>("/dependencias", {
        params: { activo: true },
      });

      return response.data.data;
    },
  });
  const actividadesBackendQuery = useQuery({
    queryKey: ["actividades-backend"],
    queryFn: async () => {
      const response = await apiClient.get<{ data: BackendActivity[]; archivedCodigos: string[] }>("/actividades");
      return response.data;
    },
    staleTime: 30_000,
  });
  const ratRecords = useMemo(() => buildRegistryWorkspace(getRatRegistryRecords()), [workspaceVersion]);
  const activityRecords = useMemo(
    () => ratRecords.flatMap((rat) => rat.activities),
    [ratRecords],
  );
  const backendActivities = useMemo(
    () => (actividadesBackendQuery.data?.data ?? []).map(mapBackendToRegistry),
    [actividadesBackendQuery.data],
  );
  const backendArchivedCodigos = useMemo(
    () => new Set(actividadesBackendQuery.data?.archivedCodigos ?? []),
    [actividadesBackendQuery.data],
  );
  const mergedActivityRecords = useMemo(() => {
    const backendCodigos = new Set(backendActivities.map((a) => a.codigo));
    const localOnly = activityRecords.filter(
      (a) => !backendCodigos.has(a.codigo) && !backendArchivedCodigos.has(a.codigo),
    );
    return [...backendActivities, ...localOnly];
  }, [backendActivities, backendArchivedCodigos, activityRecords]);
  const assignedDependencyScope = getAssignedDependencyScope(
    user,
    dependenciasQuery.data ?? [],
  );
  const scopedActivityRecords = useMemo(
    () =>
      restrictToAssignedDependency
        ? mergedActivityRecords.filter((activity) =>
            matchesAssignedDependencyScope(activity, assignedDependencyScope),
          )
        : mergedActivityRecords,
    [mergedActivityRecords, assignedDependencyScope, restrictToAssignedDependency],
  );
  const dependenciaOptions = useMemo(
    () => Array.from(new Set(scopedActivityRecords.map((item) => item.dependencia))).sort(),
    [scopedActivityRecords],
  );
  const riskOptions = getRiskOptions();
  const statusOptions = getRatStatusOptions();

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [dependencia, setDependencia] = useState(() => searchParams.get("dependencia") ?? "Todas");
  const [estado, setEstado] = useState(() => searchParams.get("estado") ?? "Todos");
  const [riesgo, setRiesgo] = useState(() => searchParams.get("riesgo") ?? "Todos");
  const [eipd, setEipd] = useState(() => searchParams.get("eipd") ?? "Todos");
  const [activeActivityId, setActiveActivityId] = useState<number | null>(null);
  const [previewActivityId, setPreviewActivityId] = useState<number | null>(null);
  const [relationshipActivityId, setRelationshipActivityId] = useState<number | null>(null);
  const [archiveActivityId, setArchiveActivityId] = useState<number | null>(null);
  const [approveActivityId, setApproveActivityId] = useState<number | null>(null);
  const [devolverActivityId, setDevolverActivityId] = useState<number | null>(null);
  const [reopenActivityId, setReopenActivityId] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const archiveMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) => {
      await apiClient.patch(`/actividades/${id}/archive`, { motivo });
    },
    onSuccess: () => {
      setArchiveActivityId(null);
      setActiveActivityId(null);
      void queryClient.invalidateQueries({ queryKey: ["actividades-backend"] });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) => {
      await apiClient.patch(`/actividades/${id}/approve`, { motivo });
    },
    onSuccess: () => {
      setApproveActivityId(null);
      setActiveActivityId(null);
      void queryClient.invalidateQueries({ queryKey: ["actividades-backend"] });
    },
  });

  const devolverMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) => {
      await apiClient.patch(`/actividades/${id}/devolver`, { motivo });
    },
    onSuccess: () => {
      setDevolverActivityId(null);
      setActiveActivityId(null);
      void queryClient.invalidateQueries({ queryKey: ["actividades-backend"] });
    },
  });

  const reopenMutation = useMutation({
    mutationFn: async ({ id, motivo }: { id: number; motivo: string }) => {
      await apiClient.patch(`/actividades/${id}/reopen`, { motivo });
    },
    onSuccess: () => {
      setReopenActivityId(null);
      setActiveActivityId(null);
      void queryClient.invalidateQueries({ queryKey: ["actividades-backend"] });
    },
  });

  const relationshipActivity =
    scopedActivityRecords.find((item) => item.id === relationshipActivityId) ?? null;
  const mapaVersionId = relationshipActivity?.versionId ?? null;

  const mapaActivosQuery = useQuery({
    queryKey: ["mapa-activos", mapaVersionId],
    queryFn: async () => {
      const res = await apiClient.get<{ data: BackendActivo[] }>(
        `/actividad-versiones/${mapaVersionId}/activos`,
      );
      return res.data.data;
    },
    enabled: mapaVersionId !== null,
    staleTime: 60_000,
  });
  const previewSurfaceRef = useRef<HTMLDivElement>(null);

  const effectiveDependencia = restrictToAssignedDependency ? "Todas" : dependencia;
  const canArchive = roleCapabilities.activities.archive;
  const visibleActivityRecords =
    estado === "Archivado" && canArchive
      ? scopedActivityRecords
      : scopedActivityRecords.filter((a) => a.estado !== "Archivado");
  const filteredActivities = visibleActivityRecords.filter((activity) => {
    const matchesSearch =
      search.trim().length === 0 ||
      [
        activity.codigo,
        activity.nombre,
        activity.ratCodigo,
        activity.dependencia,
        activity.unidadEjecutora,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    const matchesDependencia =
      effectiveDependencia === "Todas" || activity.dependencia === effectiveDependencia;
    const matchesEstado = estado === "Todos" || activity.estado === estado;
    const matchesRiesgo = riesgo === "Todos" || activity.riesgo === riesgo;
    const matchesEipd =
      eipd === "Todos" ||
      (eipd === "Si" ? activity.requiereEipd : !activity.requiereEipd);

    return matchesSearch && matchesDependencia && matchesEstado && matchesRiesgo && matchesEipd;
  });

  const activeActivity =
    scopedActivityRecords.find((item) => item.id === activeActivityId) ?? null;

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
    setDependencia(
      restrictToAssignedDependency ? "Todas" : searchParams.get("dependencia") ?? "Todas",
    );
    setEstado(searchParams.get("estado") ?? "Todos");
    setRiesgo(searchParams.get("riesgo") ?? "Todos");
    setEipd(searchParams.get("eipd") ?? "Todos");
  }, [restrictToAssignedDependency, searchParams]);

  useEffect(() => {
    if (activeActivityId === null) {
      return;
    }

    if (!scopedActivityRecords.some((item) => item.id === activeActivityId)) {
      setActiveActivityId(null);
    }
  }, [scopedActivityRecords, activeActivityId]);

  const previewActivity =
    scopedActivityRecords.find((item) => item.id === previewActivityId) ?? null;
  const previewTraceability = previewActivity
    ? getActivityTraceability(previewActivity.id)
    : null;

  const [previewSignatures, setPreviewSignatures] = useState<SignatureFieldState>(
    () => buildSignatureFields(previewActivity, previewTraceability),
  );
  useEffect(() => {
    setPreviewSignatures(buildSignatureFields(previewActivity, previewTraceability));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [previewActivityId]);

  const relationshipTraceability: ActivityTraceabilityModel | null = useMemo(() => {
    if (!relationshipActivity) return null;
    // Backend activity with a DB version → build from fetched activos
    if (mapaVersionId !== null && mapaActivosQuery.data) {
      return buildTraceabilityFromBackend(relationshipActivity, mapaActivosQuery.data);
    }
    // Hardcoded activity → use legacy lookup
    if (mapaVersionId === null) {
      return getActivityTraceability(relationshipActivity.id);
    }
    // Backend activity but query still loading → return empty shell so modal opens
    return buildTraceabilityFromBackend(relationshipActivity, []);
  }, [relationshipActivity, mapaVersionId, mapaActivosQuery.data]);

  const isAnyModalOpen =
    previewActivityId !== null ||
    relationshipActivityId !== null ||
    activeActivityId !== null ||
    archiveActivityId !== null ||
    approveActivityId !== null ||
    devolverActivityId !== null;

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (!isAnyModalOpen || typeof window === "undefined") {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPreviewActivityId(null);
        setRelationshipActivityId(null);
        setActiveActivityId(null);
        setArchiveActivityId(null);
        setApproveActivityId(null);
        setDevolverActivityId(null);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isAnyModalOpen]);

  const stats = useMemo<ExecutiveKpiItem[]>(() => {
    const total = scopedActivityRecords.length;
    const borradores = scopedActivityRecords.filter((item) => item.estado === "Borrador").length;
    const enRevision = scopedActivityRecords.filter((item) => item.estado === "En revision").length;
    const vigentes = scopedActivityRecords.filter((item) => item.estado === "Vigente").length;
    const altoRiesgo = scopedActivityRecords.filter((item) => item.riesgo === "Alto").length;

    return [
      {
        label: "Total actividades",
        value: total,
        icon: "activities" as const,
        tone: "neutral",
      },
      {
        label: "En elaboracion",
        value: borradores,
        icon: "new" as const,
        tone: borradores > 0 ? "neutral" : "success",
      },
      {
        label: "En revision",
        value: enRevision,
        icon: "audit" as const,
        tone: enRevision > 0 ? "warning" : "success",
      },
      {
        label: "Vigentes",
        value: vigentes,
        icon: "checklist" as const,
        tone: vigentes > 0 ? "success" : "neutral",
      },
      {
        label: "Riesgo alto",
        value: altoRiesgo,
        icon: "risks" as const,
        tone: altoRiesgo > 0 ? "critical" : "success",
        emphasize: altoRiesgo > 0,
      },
    ];
  }, [scopedActivityRecords]);

  function handlePrepareTreatment(activity: ActivityRegistryRecord, mode: "edit" | "duplicate") {
    seedTreatmentDraftFromActivity(activity, mode);
    navigate(`/actividades/nuevo?mode=${mode}&source=${activity.id}`);
  }

  function handleActivityStatusChange(activity: ActivityRegistryRecord) {
    const nextStatus = getNextActivityStatus(activity.estado, roleCapabilities.activities.approve);
    persistActivityStatus(activity.id, nextStatus);
    setWorkspaceVersion((current) => current + 1);
  }

  return (
    <section className="activities-page">
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Nucleo operativo</span>
          <h2>Actividades de tratamiento</h2>
          <p className="page-copy">
            Toda la gestion queda concentrada en una sola matriz: seguimiento,
            lectura documental y mapa relacional de cada tratamiento sin paneles paralelos.
          </p>
          <p className="permission-hint">
            Rol actual: <strong>{roleCapabilities.label}</strong>.{" "}
            {roleCapabilities.activities.update
              ? "Puede crear, editar y duplicar tratamientos."
              : "Puede consultar, revisar y formalizar segun el flujo de aprobacion."}
            {restrictToAssignedDependency
              ? ` Alcance: ${formatDependencyScope(assignedDependencyScope)}.`
              : " Alcance: institucional transversal."}
          </p>
        </div>

        <div className="activities-header-actions">
          <div className="activities-header-buttons">
            <Link to="/activos" className="button-secondary">
              Ver activos
            </Link>
            {roleCapabilities.activities.create ? (
              <Link to="/actividades/nuevo" className="button-primary">
                Nuevo tratamiento
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <ExecutiveKpiGrid items={stats} />

      <section className="panel activities-matrix-panel">
        <div className="panel-heading panel-heading-compact">
          <div>
            <span className="brand-kicker">Matriz institucional centralizada</span>
            <h3>Listado consolidado por actividad</h3>
          </div>
          <span className="pill">{filteredActivities.length} visibles</span>
        </div>

        <div className="activities-filters">
          <label className="field">
            <span>Buscar</span>
            <input
              className="input"
              placeholder="Actividad, RAT, dependencia"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Dependencia</span>
            <select
              className="input"
              value={dependencia}
              onChange={(event) => setDependencia(event.target.value)}
              disabled={restrictToAssignedDependency}
            >
              <option value="Todas">
                {restrictToAssignedDependency
                  ? formatDependencyScope(assignedDependencyScope)
                  : "Todas"}
              </option>
              {!restrictToAssignedDependency && dependenciaOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Estado</span>
            <select className="input" value={estado} onChange={(event) => setEstado(event.target.value)}>
              <option value="Todos">Todos</option>
              {statusOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Riesgo</span>
            <select className="input" value={riesgo} onChange={(event) => setRiesgo(event.target.value)}>
              <option value="Todos">Todos</option>
              {riskOptions.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>EIPD</span>
            <select className="input" value={eipd} onChange={(event) => setEipd(event.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Si">Si</option>
              <option value="No">No</option>
            </select>
          </label>
        </div>

        {filteredActivities.length > 0 ? (
          <TableScrollFrame className="table-wrapper-matrix" maxHeight="none">
            <table className="registry-table registry-table-activities registry-table-activities-central">
              <thead>
                <tr>
                  <th>Actividad</th>
                  <th>RAT</th>
                  <th>Dependencia</th>
                  <th>Finalidad</th>
                  <th>Unidad ejecutora</th>
                  <th>Estado</th>
                  <th>Riesgo</th>
                  <th>EIPD</th>
                  <th>Version</th>
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map((activity) => {
                  const isSelected = activeActivity?.id === activity.id;

                  return (
                  <tr
                    key={activity.id}
                    className={isSelected ? "table-row-selected table-row-interactive" : "table-row-interactive"}
                    tabIndex={0}
                    aria-selected={isSelected}
                    aria-haspopup="dialog"
                    onClick={() => setActiveActivityId(activity.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveActivityId(activity.id);
                      }
                    }}
                  >
                    <td>
                      <div className="table-primary-copy">
                        <strong>{activity.codigo}</strong>
                        <small>{activity.nombre}</small>
                      </div>
                    </td>
                    <td>
                      <div className="table-primary-copy">
                        <strong>{activity.ratCodigo}</strong>
                        <small>{activity.ratNombre}</small>
                      </div>
                    </td>
                    <td>{activity.dependencia}</td>
                    <td className="table-purpose-cell">
                      {shortenCopy(activity.report.finalidadEspecifica, 148)}
                    </td>
                    <td>{activity.unidadEjecutora}</td>
                    <td>
                      <StatusBadge value={activity.estado} />
                    </td>
                    <td>
                      <RiskBadge value={activity.riesgo} />
                    </td>
                    <td>
                      <EipdBadge value={activity.requiereEipd} />
                    </td>
                    <td>{activity.version}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </TableScrollFrame>
        ) : (
          <div className="empty-state">No hay actividades disponibles con los filtros seleccionados.</div>
        )}
      </section>

      {previewActivity ? (
        <ReportPreviewModal
          activity={previewActivity}
          heading={`Registro de actividad · ${previewActivity.codigo}`}
          isOpen
          onClose={() => setPreviewActivityId(null)}
          onDownload={() => {
            if (typeof document === "undefined") return;
            const documentHtml = buildReportDocument(
              `Registro ${previewActivity.codigo}`,
              previewActivity.report,
              previewSignatures,
              previewActivity,
            );
            const blob = new Blob([documentHtml], { type: "text/html;charset=utf-8" });
            const objectUrl = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = `${previewActivity.codigo}-${slugify(previewActivity.nombre)}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);
          }}
          onPrint={() => {
            printReportDocument(
              `Registro ${previewActivity.codigo}`,
              previewActivity.report,
              previewSignatures,
              previewActivity,
            );
          }}
          report={previewActivity.report}
          signatures={previewSignatures}
          onSignatureChange={(field, value) =>
            setPreviewSignatures((prev) => ({ ...prev, [field]: value }))
          }
          surfaceRef={previewSurfaceRef}
        />
      ) : null}

      {relationshipActivity && relationshipTraceability ? (
        <ActivityMapModal
          activity={relationshipActivity}
          isOpen
          isLoading={mapaVersionId !== null && mapaActivosQuery.isLoading}
          onClose={() => setRelationshipActivityId(null)}
          traceability={relationshipTraceability}
        />
      ) : null}

      {activeActivity ? (
        <ActivityActionModal
          activity={activeActivity}
          canApprove={roleCapabilities.activities.approve}
          canArchive={roleCapabilities.activities.archive}
          canDuplicate={roleCapabilities.activities.duplicate}
          canUpdate={roleCapabilities.activities.update}
          onApprove={() => {
            if (activeActivity.versionId) {
              setApproveActivityId(activeActivity.id);
            } else {
              persistActivityStatus(activeActivity.id, "Vigente");
              setWorkspaceVersion((current) => current + 1);
            }
          }}
          onDevolver={() => {
            if (activeActivity.versionId) {
              setDevolverActivityId(activeActivity.id);
            } else {
              persistActivityStatus(activeActivity.id, "Borrador");
              setWorkspaceVersion((current) => current + 1);
            }
          }}
          onArchive={() => {
            setArchiveActivityId(activeActivity.id);
          }}
          onChangeStatus={() => {
            if (activeActivity.versionId && activeActivity.estado === "Vigente") {
              setReopenActivityId(activeActivity.id);
            } else {
              handleActivityStatusChange(activeActivity);
            }
          }}
          onClose={() => setActiveActivityId(null)}
          onDuplicate={() => handlePrepareTreatment(activeActivity, "duplicate")}
          onEdit={() => handlePrepareTreatment(activeActivity, "edit")}
          onOpenMap={() => {
            setActiveActivityId(null);
            setRelationshipActivityId(activeActivity.id);
          }}
          onOpenPreview={() => {
            setActiveActivityId(null);
            setPreviewActivityId(activeActivity.id);
          }}
        />
      ) : null}

      {archiveActivityId !== null ? (
        <ArchiveConfirmModal
          activityCodigo={
            scopedActivityRecords.find((a) => a.id === archiveActivityId)?.codigo ?? ""
          }
          activityNombre={
            scopedActivityRecords.find((a) => a.id === archiveActivityId)?.nombre ?? ""
          }
          isSubmitting={archiveMutation.isPending}
          onConfirm={(motivo) => {
            archiveMutation.mutate({ id: archiveActivityId, motivo });
          }}
          onCancel={() => setArchiveActivityId(null)}
        />
      ) : null}

      {approveActivityId !== null ? (
        <ConfirmWithMotivoModal
          title="Aprobar actividad de tratamiento"
          description={`${scopedActivityRecords.find((a) => a.id === approveActivityId)?.codigo ?? ""} — ${scopedActivityRecords.find((a) => a.id === approveActivityId)?.nombre ?? ""}`}
          actionLabel="Confirmar aprobacion"
          variant="primary"
          isSubmitting={approveMutation.isPending}
          onConfirm={(motivo) => approveMutation.mutate({ id: approveActivityId, motivo })}
          onCancel={() => setApproveActivityId(null)}
        />
      ) : null}

      {devolverActivityId !== null ? (
        <ConfirmWithMotivoModal
          title="Devolver actividad para correccion"
          description={`${scopedActivityRecords.find((a) => a.id === devolverActivityId)?.codigo ?? ""} — ${scopedActivityRecords.find((a) => a.id === devolverActivityId)?.nombre ?? ""}`}
          actionLabel="Confirmar devolucion"
          variant="warning"
          isSubmitting={devolverMutation.isPending}
          onConfirm={(motivo) => devolverMutation.mutate({ id: devolverActivityId, motivo })}
          onCancel={() => setDevolverActivityId(null)}
        />
      ) : null}

      {reopenActivityId !== null ? (
        <ConfirmWithMotivoModal
          title="Reabrir actividad para revision"
          description={`${scopedActivityRecords.find((a) => a.id === reopenActivityId)?.codigo ?? ""} — ${scopedActivityRecords.find((a) => a.id === reopenActivityId)?.nombre ?? ""}`}
          actionLabel="Confirmar reapertura"
          variant="warning"
          isSubmitting={reopenMutation.isPending}
          onConfirm={(motivo) => reopenMutation.mutate({ id: reopenActivityId, motivo })}
          onCancel={() => setReopenActivityId(null)}
        />
      ) : null}
    </section>
  );
}

function ActivityActionModal({
  activity,
  canApprove,
  canArchive,
  canDuplicate,
  canUpdate,
  onApprove,
  onDevolver,
  onArchive,
  onChangeStatus,
  onClose,
  onDuplicate,
  onEdit,
  onOpenMap,
  onOpenPreview,
}: {
  activity: ActivityRegistryRecord;
  canApprove: boolean;
  canArchive: boolean;
  canDuplicate: boolean;
  canUpdate: boolean;
  onApprove: () => void;
  onDevolver: () => void;
  onArchive: () => void;
  onChangeStatus: () => void;
  onClose: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onOpenMap: () => void;
  onOpenPreview: () => void;
}) {
  return (
    <div className="report-preview-modal" role="dialog" aria-modal="true" aria-labelledby="activity-action-title">
      <button
        type="button"
        className="report-preview-modal-backdrop"
        aria-label="Cerrar gestion del tratamiento"
        onClick={onClose}
      />

      <div className="report-preview-modal-dialog activity-action-modal">
        <header className="report-preview-modal-header">
          <div>
            <span className="brand-kicker">Gestion del registro</span>
            <h3 id="activity-action-title">
              {activity.codigo} · {activity.nombre}
            </h3>
            <p className="page-copy">
              Revise el contexto del tratamiento y ejecute la accion que corresponda sin salir de la vista.
            </p>
          </div>

          <div className="report-preview-modal-actions">
            <button type="button" className="button-secondary" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </header>

        <div className="report-preview-modal-body">
          <div className="activity-action-modal-grid">
            <div className="detail-block">
              <h4>Contexto del tratamiento</h4>
              <dl className="detail-grid">
                <div>
                  <dt>RAT asociado</dt>
                  <dd>{activity.ratCodigo}</dd>
                </div>
                <div>
                  <dt>Version</dt>
                  <dd>{activity.version}</dd>
                </div>
                <div>
                  <dt>Dependencia</dt>
                  <dd>{activity.dependencia}</dd>
                </div>
                <div>
                  <dt>Unidad ejecutora</dt>
                  <dd>{activity.unidadEjecutora}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <StatusBadge value={activity.estado} />
                  </dd>
                </div>
                <div>
                  <dt>Riesgo</dt>
                  <dd>
                    <RiskBadge value={activity.riesgo} />
                  </dd>
                </div>
                <div>
                  <dt>EIPD</dt>
                  <dd>
                    <EipdBadge value={activity.requiereEipd} />
                  </dd>
                </div>
                <div className="detail-span">
                  <dt>Finalidad</dt>
                  <dd>{activity.report.finalidadEspecifica}</dd>
                </div>
              </dl>
            </div>

            <div className="detail-block">
              <h4>Acciones disponibles</h4>
              <div className="activity-action-modal-actions">
                {canUpdate ? (
                  <button type="button" className="button-table-action" onClick={onEdit}>
                    Editar
                  </button>
                ) : null}
                {canDuplicate ? (
                  <button
                    type="button"
                    className="button-table-action button-table-action-secondary"
                    onClick={onDuplicate}
                  >
                    Duplicar
                  </button>
                ) : null}
                {canApprove && activity.estado === "En revision" ? (
                  <>
                    <button
                      type="button"
                      className="button-table-action button-table-action-primary"
                      onClick={onApprove}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      className="button-table-action"
                      style={{ borderColor: "var(--warning, #d97706)", color: "var(--warning, #d97706)" }}
                      onClick={onDevolver}
                    >
                      Devolver
                    </button>
                  </>
                ) : (canUpdate || canApprove) ? (
                  <button
                    type="button"
                    className="button-table-action button-table-action-secondary"
                    onClick={onChangeStatus}
                  >
                    {getActivityLifecycleLabel(activity.estado, canApprove)}
                  </button>
                ) : null}
                {canArchive && activity.estado !== "Archivado" ? (
                  <button
                    type="button"
                    className="button-table-action button-table-action-danger"
                    onClick={onArchive}
                  >
                    Archivar
                  </button>
                ) : null}
                <button type="button" className="button-table-action" onClick={onOpenPreview}>
                  Vista previa
                </button>
                <button
                  type="button"
                  className="button-table-action button-table-action-secondary"
                  onClick={onOpenMap}
                >
                  Mapa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getNextActivityStatus(
  currentStatus: ActivityRegistryRecord["estado"],
  canApprove: boolean,
): ActivityRegistryRecord["estado"] {
  if (currentStatus === "Borrador") {
    return "En revision";
  }

  if (currentStatus === "En revision") {
    return canApprove ? "Vigente" : "Borrador";
  }

  if (currentStatus === "Archivado") {
    return "En revision";
  }

  return "En revision";
}

function getActivityLifecycleLabel(
  currentStatus: ActivityRegistryRecord["estado"],
  canApprove: boolean,
) {
  if (currentStatus === "Borrador") {
    return "Enviar revision";
  }

  if (currentStatus === "En revision") {
    return canApprove ? "Publicar" : "Devolver borrador";
  }

  if (currentStatus === "Archivado") {
    return "Reactivar";
  }

  return "Reabrir";
}

function StatusBadge({ value }: { value: ActivityRegistryRecord["estado"] }) {
  return <span className={`pill status-pill-${normalizeToken(value)}`}>{value}</span>;
}

function RiskBadge({ value }: { value: ActivityRegistryRecord["riesgo"] }) {
  return <span className={`pill risk-pill-${normalizeToken(value)}`}>{value}</span>;
}

function EipdBadge({ value }: { value: boolean }) {
  return (
    <span className={value ? "pill eipd-pill-yes" : "pill eipd-pill-no"}>
      {value ? "Si" : "No"}
    </span>
  );
}

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function shortenCopy(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength).trimEnd()}...`;
}

function buildSignatureFields(
  activity: ActivityRegistryRecord | null,
  traceability: ReturnType<typeof getActivityTraceability> | null,
): SignatureFieldState {
  if (!activity) {
    return defaultSignatureFields;
  }

  return {
    elaboradoPorNombre:
      traceability?.owner.nombre ?? defaultSignatureFields.elaboradoPorNombre,
    elaboradoPorCargo:
      traceability?.owner.cargo ?? defaultSignatureFields.elaboradoPorCargo,
    revisadoPorNombre: defaultSignatureFields.revisadoPorNombre,
    revisadoPorCargo: defaultSignatureFields.revisadoPorCargo,
    autoridadNombre: activity.responsables[0] ?? defaultSignatureFields.autoridadNombre,
    autoridadCargo: activity.unidadEjecutora || defaultSignatureFields.autoridadCargo,
  };
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function mapEstado(raw: string | null): RecordStatus {
  if (!raw) return "Borrador";
  const s = raw.toUpperCase();
  if (s === "VIGENTE") return "Vigente";
  if (s === "EN_REVISION" || s === "REVISION") return "En revision";
  if (s === "ARCHIVADO") return "Archivado";
  return "Borrador";
}

function buildTraceabilityFromBackend(
  activity: ActivityRegistryRecord,
  activos: BackendActivo[],
): ActivityTraceabilityModel {
  const assets: ActivityTraceabilityAsset[] = activos.map((r) => ({
    id: String(r.activo.id),
    nombre: r.activo.nombre,
    tipo: r.activo.tipoActivo?.nombre ?? "Activo de información",
    criticidad: mapImpactoToCriticidad(r.activo.impacto?.nombre ?? null),
    custodio: r.activo.custodio ?? r.activo.areaCustodio ?? "Pendiente",
    plataforma:
      r.activo.unidadPropietariaActivo ??
      r.activo.direccionIpUrl ??
      "Sin plataforma registrada",
  }));

  const cats = Array.isArray((activity as unknown as { categoriasDatos?: unknown }).categoriasDatos)
    ? (activity as unknown as { categoriasDatos: string[] }).categoriasDatos
    : activity.report.categoriasDatos
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

  return {
    owner: {
      nombre: activity.responsables[0] ?? "Responsable institucional",
      cargo: activity.unidadEjecutora || "Unidad ejecutora",
      unidad: activity.dependencia,
    },
    activos: assets,
    categoriasDatos: cats,
    titularesImpactados: activity.report.titulares
      ? [activity.report.titulares]
      : [],
    tercerosRelacionados: [],
    controlesClave: activity.report.medidasSeguridad
      ? [activity.report.medidasSeguridad]
      : [],
    riesgosRelacionados: [],
    artefactosRelacionados: [],
    flujosRelacionados: [],
    puntosExposicion: [],
    accionesContencion: [],
  };
}

function mapImpactoToCriticidad(
  impacto: string | null,
): ActivityTraceabilityAsset["criticidad"] {
  if (!impacto) return "Media";
  const n = impacto.toUpperCase();
  if (n.includes("CATASTRO") || n.includes("MAYOR")) return "Alta";
  if (n.includes("MENOR") || n.includes("INSIGNIFICANTE")) return "Baja";
  return "Media";
}

function mapBackendToRegistry(a: BackendActivity): ActivityRegistryRecord {
  const estado = a.estadoGeneral === "ARCHIVADO"
    ? ("Archivado" as RecordStatus)
    : mapEstado(a.estadoVersionActual);
  const cats = Array.isArray(a.categoriasDatos)
    ? (a.categoriasDatos as string[]).join(", ")
    : "";
  const acciones = Array.isArray(a.accionesTratamiento)
    ? (a.accionesTratamiento as string[]).join(", ")
    : "";
  const fecha = a.fechaLevantamiento ? a.fechaLevantamiento.slice(0, 10) : "";
  return {
    id: a.id,
    ratId: a.ratId,
    versionId: a.versionActualId ?? undefined,
    codigo: a.codigo,
    nombre: a.nombre,
    ratCodigo: a.ratCodigo,
    ratNombre: a.rat,
    dependencia: a.dependencia,
    unidadEjecutora: a.subdireccion ?? "",
    estado,
    riesgo: "Bajo" as RiskLevel,
    requiereEipd: a.requiereEipd,
    version: a.versionActual ?? "1.0",
    fechaActualizacion: fecha,
    responsables: [],
    observaciones: [],
    pendientes: [],
    report: {
      codigoRat: a.ratCodigo,
      nombreTratamiento: a.nombre,
      dependenciaResponsable: a.dependencia,
      procesoRelacionado: a.macroproceso ?? "",
      subproceso: a.subproceso ?? a.proceso ?? "",
      estado,
      nivelRiesgo: "Bajo" as RiskLevel,
      requiereEipd: a.requiereEipd,
      fechaCreacion: "",
      ultimaActualizacion: fecha,
      finalidadEspecifica: a.finalidad ?? "",
      baseLicitud: a.baseLicitud ?? "",
      normaAplicable: a.normaAplicable ?? "",
      titulares: a.categoriasTitulares ?? "",
      categoriasDatos: cats,
      datosSensibles: "",
      datosNna: "",
      origenDatos: a.origenDatos ?? "",
      mediosRecoleccion: "",
      accionesTratamiento: acciones,
      plazoConservacion: a.plazoConservacion ?? "",
      criteriosConservacion: "",
      supresionAnonimizacion: "",
      destinatariosInternos: "",
      destinatariosExternos: "",
      transferenciasInternacionales: "",
      paisDestino: "",
      mecanismoTransferencia: "",
      medidasSeguridad: a.medidaSeguridad ?? "",
    },
  };
}
