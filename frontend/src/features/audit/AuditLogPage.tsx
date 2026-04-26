import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";
import type { AuditLog } from "./audit.types";

type AuditFilters = {
  modulo: string;
  entidad: string;
  accion: string;
  actor: string;
  search: string;
};

type AuditLogListResponse = {
  data: AuditLog[];
};

const EMPTY_FILTERS: AuditFilters = {
  modulo: "",
  entidad: "",
  accion: "",
  actor: "",
  search: "",
};

const dateFormatter = new Intl.DateTimeFormat("es-EC", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AuditLogPage() {
  const { register, handleSubmit, reset } = useForm<AuditFilters>({
    defaultValues: EMPTY_FILTERS,
  });

  const [activeFilters, setActiveFilters] = useState<AuditFilters>(EMPTY_FILTERS);
  const [selectedLogId, setSelectedLogId] = useState<number | null>(null);
  const deferredFilters = useDeferredValue(activeFilters);

  const auditLogsQuery = useQuery({
    queryKey: ["audit-logs", deferredFilters],
    queryFn: async () => {
      const response = await apiClient.get<AuditLogListResponse>("/audit-logs", {
        params: compactFilters(deferredFilters),
      });

      return response.data.data;
    },
  });

  const logs = auditLogsQuery.data ?? [];

  useEffect(() => {
    if (!logs.length) {
      setSelectedLogId(null);
      return;
    }

    if (!logs.some((log) => log.id === selectedLogId)) {
      setSelectedLogId(logs[0].id);
    }
  }, [logs, selectedLogId]);

  const selectedLog =
    logs.find((log) => log.id === selectedLogId) ?? logs[0] ?? null;

  const summary = useMemo(() => {
    const uniqueActors = new Set(logs.map((log) => log.actor).filter(Boolean));
    const uniqueModules = new Set(logs.map((log) => log.modulo));
    const criticalActions = logs.filter((log) =>
      ["ARCHIVE", "DELETE", "SET_CURRENT"].includes(log.accion),
    ).length;

    return [
      { label: "Registros listados", value: String(logs.length) },
      { label: "Actores visibles", value: String(uniqueActors.size) },
      { label: "Modulos visibles", value: String(uniqueModules.size) },
      { label: "Acciones sensibles", value: String(criticalActions) },
    ];
  }, [logs]);

  return (
    <section>
      <header className="page-header page-header-inline">
        <div>
          <span className="brand-kicker">Trazabilidad</span>
          <h2>Auditoria del sistema</h2>
          <p className="page-copy">
            Consulta eventos registrados por backend con actor, accion,
            contexto y detalle antes/despues.
          </p>
        </div>
      </header>

      <div className="summary-grid">
        {summary.map((item) => (
          <article key={item.label} className="stat-card">
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <form
        className="panel filter-grid"
        onSubmit={handleSubmit((values) => setActiveFilters(values))}
      >
        <label className="field">
          <span>Modulo</span>
          <input className="input" placeholder="rat, riesgos, eipd" {...register("modulo")} />
        </label>

        <label className="field">
          <span>Entidad</span>
          <input
            className="input"
            placeholder="Rat, ActividadVersion, RiesgoEvaluacion"
            {...register("entidad")}
          />
        </label>

        <label className="field">
          <span>Accion</span>
          <input className="input" placeholder="CREATE, UPDATE, DELETE" {...register("accion")} />
        </label>

        <label className="field">
          <span>Actor</span>
          <input className="input" placeholder="admin" {...register("actor")} />
        </label>

        <label className="field full-width">
          <span>Busqueda libre</span>
          <input
            className="input"
            placeholder="Busque por descripcion, modulo, actor o accion"
            {...register("search")}
          />
        </label>

        <div className="actions actions-start full-width">
          <button type="submit" className="button-primary">
            Aplicar filtros
          </button>
          <button
            type="button"
            className="button-secondary"
            onClick={() => {
              reset(EMPTY_FILTERS);
              setActiveFilters(EMPTY_FILTERS);
            }}
          >
            Limpiar
          </button>
        </div>
      </form>

      <div className="audit-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">Eventos</span>
              <h3>Linea de tiempo</h3>
            </div>
            {auditLogsQuery.isFetching ? <span className="pill">Actualizando</span> : null}
          </div>

          {auditLogsQuery.isPending ? (
            <div className="empty-state">Cargando auditoria...</div>
          ) : auditLogsQuery.isError ? (
            <div className="empty-state">
              No fue posible consultar auditoria. Revise login o backend.
            </div>
          ) : logs.length === 0 ? (
            <div className="empty-state">No hay registros para los filtros seleccionados.</div>
          ) : (
            <div className="table-wrapper">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Modulo</th>
                    <th>Entidad</th>
                    <th>Accion</th>
                    <th>Actor</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={log.id === selectedLog?.id ? "table-row-selected" : ""}
                      onClick={() => setSelectedLogId(log.id)}
                    >
                      <td>{formatAuditDate(log.fecha)}</td>
                      <td>{log.modulo}</td>
                      <td>
                        <div>{log.entidad}</div>
                        <small>ID {log.entidadId ?? "-"}</small>
                      </td>
                      <td>
                        <span className="pill">{log.accion}</span>
                      </td>
                      <td>
                        <div>{log.actor ?? "system"}</div>
                        <small>{log.actorRole ?? "sin rol"}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <span className="brand-kicker">Detalle</span>
              <h3>Registro seleccionado</h3>
            </div>
          </div>

          {!selectedLog ? (
            <div className="empty-state">
              Seleccione un registro para revisar cambios y metadata.
            </div>
          ) : (
            <div className="detail-stack">
              <div className="detail-block">
                <h4>Resumen</h4>
                <dl className="detail-grid">
                  <div>
                    <dt>Fecha</dt>
                    <dd>{formatAuditDate(selectedLog.fecha)}</dd>
                  </div>
                  <div>
                    <dt>Modulo</dt>
                    <dd>{selectedLog.modulo}</dd>
                  </div>
                  <div>
                    <dt>Entidad</dt>
                    <dd>
                      {selectedLog.entidad} #{selectedLog.entidadId ?? "-"}
                    </dd>
                  </div>
                  <div>
                    <dt>Actor</dt>
                    <dd>
                      {selectedLog.actor ?? "system"} / {selectedLog.actorRole ?? "sin rol"}
                    </dd>
                  </div>
                  <div className="detail-span">
                    <dt>Descripcion</dt>
                    <dd>{selectedLog.descripcion ?? "Sin descripcion"}</dd>
                  </div>
                </dl>
              </div>

              <div className="detail-block">
                <h4>Antes</h4>
                <pre className="json-box">{toPrettyJson(selectedLog.detalleAntes)}</pre>
              </div>

              <div className="detail-block">
                <h4>Despues</h4>
                <pre className="json-box">{toPrettyJson(selectedLog.detalleDespues)}</pre>
              </div>

              <div className="detail-block">
                <h4>Metadata</h4>
                <pre className="json-box">{toPrettyJson(selectedLog.metadata)}</pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function compactFilters(filters: AuditFilters) {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value.trim().length > 0),
  );
}

function formatAuditDate(value: string) {
  return dateFormatter.format(new Date(value));
}

function toPrettyJson(value: unknown) {
  if (value === null || value === undefined) {
    return "Sin datos";
  }

  return JSON.stringify(value, null, 2);
}
