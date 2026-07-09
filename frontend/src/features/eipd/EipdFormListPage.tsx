import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import { useEipdFormDelete, useEipdFormList } from "./eipd-form.api";

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_ELABORACION: "En elaboracion",
  EN_REVISION: "En revision DPD",
  DEVUELTO: "Devuelto",
  APROBADO: "Aprobado",
  CERRADO: "Cerrado",
};

const ESTADO_PILL: Record<string, string> = {
  BORRADOR: "status-pill-borrador",
  EN_ELABORACION: "status-pill-en-elaboracion",
  EN_REVISION: "status-pill-en-revision",
  DEVUELTO: "status-pill-devuelto",
  APROBADO: "status-pill-aprobado",
  CERRADO: "status-pill-archivado",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export function EipdFormListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cap = getRoleCapabilities(user?.role).eipdForm;
  const isRevisor = user?.role?.toUpperCase() === "REVISOR" || (user?.role?.toUpperCase()?.startsWith("REVISOR_") ?? false);
  const { data: list = [], isLoading } = useEipdFormList();
  const deleteMutation = useEipdFormDelete();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [filterDep, setFilterDep] = useState("Todas");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  function resolveDep(r: (typeof list)[number]) {
    return r.actividadVersion?.actividad.rat?.dependencia ?? r.createdByDependencia ?? null;
  }

  const depCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of list) {
      const dep = resolveDep(r)?.nombre ?? "Sin dependencia";
      counts[dep] = (counts[dep] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [list]);

  const depOptions = useMemo(() => depCounts.map(([dep]) => dep), [depCounts]);

  const filtered = list.filter((r) => {
    const q = search.trim().toLowerCase();
    const actividadText = r.actividadVersion
      ? `${r.actividadVersion.actividad.codigo} ${r.actividadVersion.actividad.nombre}`
      : "";
    const dep = resolveDep(r)?.nombre ?? "Sin dependencia";
    const matchSearch =
      !q ||
      [r.codigo, r.titulo ?? "", actividadText, dep].join(" ").toLowerCase().includes(q);
    const matchEstado = filterEstado === "Todos" || r.estado === filterEstado;
    const matchDep = filterDep === "Todas" || dep === filterDep;
    return matchSearch && matchEstado && matchDep;
  });

  function handleNew() {
    navigate("/eipd/evaluacion/new");
  }

  async function handleDelete(id: number) {
    await deleteMutation.mutateAsync(id);
    setConfirmDeleteId(null);
  }

  return (
    <section className="list-page">
      <header className="page-header page-header-inline" style={{ padding: "18px 24px 14px" }}>
        <div style={{ flex: 1 }}>
          <span className="brand-kicker">Privacidad · LOPDP</span>
          <h2>EIPD</h2>
          <p className="page-copy">Evaluacion de Impacto del Tratamiento de Datos Personales · Metodologia SPDP Ecuador</p>
        </div>
        {cap.create && (
          <button type="button" className="button-primary" onClick={handleNew}>
            + Nuevo EIPD
          </button>
        )}
      </header>

      {isRevisor && depCounts.length > 0 && (
        <div className="kpi-strip">
          {depCounts.map(([dep, count]) => (
            <button
              key={dep}
              type="button"
              className="kpi-strip-item"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                padding: "4px 10px",
                borderRadius: "var(--radius-sm)",
                outline: filterDep === dep ? "2px solid var(--brand)" : "none",
              }}
              onClick={() => setFilterDep(filterDep === dep ? "Todas" : dep)}
            >
              <span className="kpi-strip-num">{count}</span>
              <span style={{ fontSize: 11, color: "var(--muted)", lineHeight: 1.2, maxWidth: 140, display: "block" }}>
                {dep}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="list-page-toolbar">
        <input
          type="text"
          placeholder="Buscar por codigo, actividad, dependencia o titulo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          <option value="Todos">Todos los estados</option>
          <option value="BORRADOR">Borrador</option>
          <option value="EN_ELABORACION">En elaboracion</option>
          <option value="EN_REVISION">En revision DPD</option>
          <option value="DEVUELTO">Devuelto</option>
          <option value="APROBADO">Aprobado</option>
          <option value="CERRADO">Cerrado</option>
        </select>
        {isRevisor && (
          <select value={filterDep} onChange={(e) => setFilterDep(e.target.value)}>
            <option value="Todas">Todas las dependencias</option>
            {depOptions.map((dep) => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </select>
        )}
      </div>

      <div className="list-page-table-wrap">
        {isLoading ? (
          <div className="list-page-empty"><p>Cargando formularios EIPD…</p></div>
        ) : filtered.length === 0 ? (
          <div className="list-page-empty">
            <p>{list.length === 0 ? "Aun no hay formularios EIPD registrados." : "Ningun formulario coincide con los filtros."}</p>
            {list.length === 0 && cap.create && (
              <button type="button" className="button-primary" onClick={handleNew}>
                + Crear primer formulario EIPD
              </button>
            )}
          </div>
        ) : (
          <table className="list-page-table">
            <thead>
              <tr>
                <th>Codigos</th>
                <th>Actividad de Tratamiento</th>
                {isRevisor && <th>Dependencia</th>}
                <th>Titulo</th>
                {isRevisor && <th>Creado por</th>}
                <th>Estado</th>
                <th>Creado</th>
                <th>Ultima actualizacion</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const dep = resolveDep(r);
                return (
                  <tr
                    key={r.id}
                    className="table-row-interactive"
                    onClick={() => navigate(`/eipd/evaluacion/${r.id}`)}
                  >
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: "var(--brand)" }}>
                          {r.codigo}
                        </span>
                        {r.actividadVersion && (
                          <span style={{ fontFamily: "monospace", fontSize: 11, color: "var(--muted)" }}>
                            {r.actividadVersion.actividad.codigo}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {r.actividadVersion ? (
                        <span style={{ fontSize: 12 }}>
                          <span style={{ color: "var(--muted)" }}>{r.actividadVersion.actividad.nombre}</span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 12 }}>Independiente</span>
                      )}
                    </td>
                    {isRevisor && (
                      <td>
                        {dep ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{dep.sigla ?? dep.nombre}</span>
                            {dep.sigla && (
                              <span style={{ fontSize: 11, color: "var(--muted)" }}>{dep.nombre}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontStyle: "italic", fontSize: 12 }}>—</span>
                        )}
                      </td>
                    )}
                    <td>{r.titulo ?? <span style={{ color: "var(--muted)", fontStyle: "italic" }}>Sin titulo</span>}</td>
                    {isRevisor && (
                      <td style={{ color: "var(--muted)", fontSize: 12 }}>
                        {r.createdByNombre ?? <span style={{ fontStyle: "italic" }}>—</span>}
                      </td>
                    )}
                    <td>
                      <span className={`pill status-pill ${ESTADO_PILL[r.estado] ?? "status-pill-borrador"}`}>
                        {ESTADO_LABELS[r.estado] ?? r.estado}
                      </span>
                    </td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{fmt(r.createdAt)}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>{fmt(r.updatedAt)}</td>
                    <td onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button
                        type="button"
                        className="button-table-action"
                        onClick={() => navigate(`/eipd/evaluacion/${r.id}`)}
                      >
                        Abrir
                      </button>
                      {cap.delete && ["BORRADOR", "EN_ELABORACION"].includes(r.estado) && (
                        confirmDeleteId === r.id ? (
                          <>
                            <button
                              type="button"
                              style={{ fontSize: 11, padding: "3px 8px", background: "var(--danger)", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 700 }}
                              disabled={deleteMutation.isPending}
                              onClick={() => void handleDelete(r.id)}
                            >
                              Confirmar
                            </button>
                            <button
                              type="button"
                              style={{ fontSize: 11, padding: "3px 8px", background: "transparent", color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 6, cursor: "pointer" }}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancelar
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            style={{ fontSize: 11, padding: "3px 8px", background: "var(--danger-soft)", color: "var(--danger)", border: "1px solid var(--danger)", borderRadius: 6, cursor: "pointer", fontWeight: 600 }}
                            onClick={() => setConfirmDeleteId(r.id)}
                          >
                            Eliminar
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
