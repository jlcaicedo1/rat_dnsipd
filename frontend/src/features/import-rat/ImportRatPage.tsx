import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";

type Dependencia = { id: number; nombre: string; sigla: string | null };
type ImportResult = {
  rat: string;
  actividadesCreadas: number;
  actividadesActualizadas: number;
  categoriasNuevas: string[];
  advertencias: string[];
};

async function fetchDependencias(): Promise<Dependencia[]> {
  const { data } = await apiClient.get<{ data: Dependencia[] }>("/dependencias", {
    params: { activo: true },
  });
  return data.data;
}

export function ImportRatPage() {
  const [dependenciaId, setDependenciaId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const { data: dependencias = [] } = useQuery({
    queryKey: ["dependencias-list"],
    queryFn: fetchDependencias,
    staleTime: 60_000,
  });

  function handleFile(f: File | null) {
    if (!f) return;
    if (!f.name.match(/\.xlsx?$/i)) {
      setError("Solo se permiten archivos Excel (.xlsx, .xls)");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) { setError("Selecciona un archivo Excel"); return; }
    if (!dependenciaId) { setError("Selecciona la dependencia"); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post<{ data: ImportResult }>(
        `/admin/import/rat-matrix/${dependenciaId}`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(data.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Error al importar el archivo";
      setError(typeof msg === "string" ? msg : JSON.stringify(msg));
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setFile(null);
    setResult(null);
    setError(null);
    setDependenciaId("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const selectedDep = dependencias.find((d) => String(d.id) === dependenciaId);

  return (
    <section className="list-page">
      <header className="page-header page-header-inline" style={{ padding: "18px 24px 14px" }}>
        <div style={{ flex: 1 }}>
          <span className="brand-kicker">Administracion · Importacion</span>
          <h2>Importar Matriz RAT</h2>
          <p className="page-copy">
            Carga masiva de actividades de tratamiento desde archivo Excel (Matriz RAT institucional).
            Solo disponible para Administrador Funcional.
          </p>
        </div>
      </header>

      <div style={{ padding: "0 24px 32px", maxWidth: 720 }}>
        {result ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              style={{
                padding: "20px 24px",
                background: "rgba(22, 163, 74, 0.07)",
                border: "1px solid rgba(22, 163, 74, 0.25)",
                borderRadius: "var(--radius)",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: "#15803d", fontSize: 15 }}>
                Importacion completada exitosamente
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
                RAT: <strong>{result.rat}</strong>
              </p>
            </div>

            <div className="kpi-strip" style={{ flexWrap: "nowrap" }}>
              <div className="kpi-strip-item">
                <span className="kpi-strip-num" style={{ color: "#15803d" }}>{result.actividadesCreadas}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Actividades creadas</span>
              </div>
              <div className="kpi-strip-item">
                <span className="kpi-strip-num" style={{ color: "#0369a1" }}>{result.actividadesActualizadas}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Actividades actualizadas</span>
              </div>
              {result.categoriasNuevas.length > 0 && (
                <div className="kpi-strip-item">
                  <span className="kpi-strip-num" style={{ color: "#7c3aed" }}>{result.categoriasNuevas.length}</span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>Categorias nuevas</span>
                </div>
              )}
            </div>

            {result.categoriasNuevas.length > 0 && (
              <div style={{ padding: "12px 16px", background: "rgba(124,58,237,0.06)", borderRadius: 8, border: "1px solid rgba(124,58,237,0.2)" }}>
                <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, color: "#7c3aed" }}>Categorias de datos creadas automaticamente:</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {result.categoriasNuevas.map((c) => (
                    <span key={c} style={{ fontFamily: "monospace", fontSize: 11, padding: "2px 8px", background: "rgba(124,58,237,0.1)", borderRadius: 4, color: "#6d28d9" }}>
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.advertencias.length > 0 && (
              <div style={{ padding: "12px 16px", background: "rgba(217,119,6,0.06)", borderRadius: 8, border: "1px solid rgba(217,119,6,0.25)" }}>
                <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: "#92400e" }}>Advertencias:</p>
                {result.advertencias.map((w, i) => (
                  <p key={i} style={{ margin: "2px 0", fontSize: 12, color: "#92400e" }}>{w}</p>
                ))}
              </div>
            )}

            <button type="button" className="button-secondary" style={{ width: "fit-content" }} onClick={handleReset}>
              Importar otro archivo
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Dependencia destino *</label>
              <select
                className="input"
                value={dependenciaId}
                onChange={(e) => setDependenciaId(e.target.value)}
                required
              >
                <option value="">Seleccionar dependencia…</option>
                {dependencias.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.sigla ? `${d.sigla} — ` : ""}{d.nombre}
                  </option>
                ))}
              </select>
              {selectedDep && (
                <small style={{ color: "var(--muted)", marginTop: 4, display: "block" }}>
                  Las actividades importadas se asociarán a esta dependencia
                </small>
              )}
            </div>

            <div className="field">
              <label style={{ fontSize: 13, fontWeight: 600 }}>Archivo Excel (Matriz RAT) *</label>
              <div
                style={{
                  border: `2px dashed ${dragOver ? "var(--brand)" : "var(--line)"}`,
                  borderRadius: "var(--radius)",
                  padding: "32px 24px",
                  textAlign: "center",
                  background: dragOver ? "rgba(23,79,159,0.04)" : "transparent",
                  cursor: "pointer",
                  transition: "border-color 0.15s, background 0.15s",
                }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFile(e.dataTransfer.files[0] ?? null);
                }}
              >
                {file ? (
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: "var(--ink)" }}>{file.name}</p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                      {(file.size / 1024).toFixed(1)} KB · Haz clic para cambiar
                    </p>
                  </div>
                ) : (
                  <div>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--muted)" }}>
                      Arrastra el archivo aqui o haz clic para seleccionar
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--muted)" }}>
                      Formato: .xlsx o .xls · Maximo 10 MB
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              />
            </div>

            {error && (
              <div style={{ padding: "10px 14px", background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8 }}>
                <p style={{ margin: 0, fontSize: 13, color: "#b91c1c" }}>{error}</p>
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="submit"
                className="button-primary"
                disabled={loading || !file || !dependenciaId}
              >
                {loading ? "Importando…" : "Importar actividades"}
              </button>
              {file && (
                <button type="button" className="button-secondary" onClick={handleReset}>
                  Limpiar
                </button>
              )}
            </div>

            <div style={{ padding: "12px 16px", background: "var(--surface)", borderRadius: 8, border: "1px solid var(--line)" }}>
              <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600 }}>Formato esperado del Excel:</p>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                <li>Primera fila: encabezados de columna</li>
                <li>Columna A: ID Actividad (ej. RAT-IESS-DSSC-001)</li>
                <li>Columna E: Nombre de la actividad de tratamiento</li>
                <li>Columna F: Finalidad del tratamiento</li>
                <li>Columna G: Base legitimadora</li>
                <li>Columna J: Categoria de datos personales (una por fila)</li>
                <li>Columna AP: Plazo de retencion</li>
                <li>Multiples filas por actividad para multiples categorias de datos</li>
              </ul>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
