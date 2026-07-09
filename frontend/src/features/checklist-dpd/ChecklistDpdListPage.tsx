import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../auth/auth-store";
import { getRoleCapabilities } from "../auth/permissions";
import { useChecklistDpdDelete, useChecklistDpdList } from "./checklist-dpd.api";

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: "Borrador",
  EN_REVISION: "En revision",
  APROBADO: "Aprobado",
  CERRADO: "Cerrado",
};

const ESTADO_CLASS: Record<string, string> = {
  BORRADOR: "borrador",
  EN_REVISION: "revision",
  APROBADO: "aprobado",
  CERRADO: "cerrado",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
}

export function ChecklistDpdListPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const cap = getRoleCapabilities(user?.role).checklistDpd;
  const isRevisor = user?.role?.toUpperCase() === 'REVISOR' || (user?.role?.toUpperCase()?.startsWith('REVISOR_') ?? false);
  const { data: list = [], isLoading } = useChecklistDpdList();
  const deleteMutation = useChecklistDpdDelete();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("Todos");
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const filtered = list.filter((r) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q || [r.codigo, r.titulo ?? ""].join(" ").toLowerCase().includes(q);
    const matchEstado = filterEstado === "Todos" || r.estado === filterEstado;
    return matchSearch && matchEstado;
  });

  function handleNew() {
    navigate('/checklist-dpd/new');
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
          <h2>Diseño Defecto</h2>
          <p className="page-copy">Evaluacion de madurez DevPrivOps · DevSecOps · DevRiskOps por periodo y proceso</p>
        </div>
        {cap.create && (
          <button
            type="button"
            className="button-primary"
            onClick={handleNew}
          >
            + Nuevo checklist
          </button>
        )}
      </header>

      <div className="list-page-toolbar">
        <input
          type="text"
          placeholder="Buscar por codigo o titulo…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value)}>
          <option>Todos</option>
          <option value="BORRADOR">Borrador</option>
          <option value="EN_REVISION">En revision</option>
          <option value="APROBADO">Aprobado</option>
          <option value="CERRADO">Cerrado</option>
        </select>
      </div>

      <div className="list-page-table-wrap">
        {isLoading ? (
          <div className="list-page-empty"><p>Cargando checklists…</p></div>
        ) : filtered.length === 0 ? (
          <div className="list-page-empty">
            <p>{list.length === 0 ? "Aun no hay checklists registrados." : "Ningún checklist coincide con los filtros."}</p>
            {list.length === 0 && cap.create && (
              <button type="button" className="button-primary" onClick={handleNew}>
                + Crear primer checklist
              </button>
            )}
          </div>
        ) : (
          <table className="list-page-table">
            <thead>
              <tr>
                <th>Codigo</th>
                <th>Titulo / Proceso</th>
                {isRevisor && <th>Creado por</th>}
                <th>Estado</th>
                <th>Creado</th>
                <th>Ultima actualizacion</th>
                <th style={{ width: 100 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="table-row-interactive"
                  onClick={() => navigate(`/checklist-dpd/${r.id}`)}
                >
                  <td>
                    <span style={{ fontFamily: "monospace", fontWeight: 700, fontSize: 12, color: "var(--iess-navy)" }}>
                      {r.codigo}
                    </span>
                  </td>
                  <td>{r.titulo ?? <span style={{ color: "var(--muted)", fontStyle: "italic" }}>Sin titulo</span>}</td>
                  {isRevisor && (
                    <td style={{ color: "var(--muted)", fontSize: 12 }}>
                      {r.createdByNombre ?? <span style={{ fontStyle: "italic" }}>—</span>}
                    </td>
                  )}
                  <td>
                    <span className={`status-badge ${ESTADO_CLASS[r.estado] ?? "borrador"}`}>
                      {ESTADO_LABELS[r.estado] ?? r.estado}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{fmt(r.createdAt)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{fmt(r.updatedAt)}</td>
                  <td onClick={(e) => e.stopPropagation()} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <button
                      type="button"
                      className="button-table-action"
                      style={{ fontSize: 12, padding: "4px 12px" }}
                      onClick={() => navigate(`/checklist-dpd/${r.id}`)}
                    >
                      Abrir
                    </button>
                    {cap.delete && r.estado === "BORRADOR" && (
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
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
