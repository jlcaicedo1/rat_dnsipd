import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNotificaciones,
  useNotificacionesCount,
  type Notificacion,
} from "./notifications.api";

const MODULO_LABEL: Record<string, string> = {
  actividades: "Actividades",
  eipd: "EIPD",
  "checklist-dpd": "Checklist DPD",
  activos: "Activos",
};

function tiempoRelativo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const countQuery = useNotificacionesCount();
  const listQuery = useNotificaciones();
  const marcarLeida = useMarcarLeida();
  const marcarTodas = useMarcarTodasLeidas();

  const count = countQuery.data ?? 0;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleToggle() {
    setOpen((prev) => !prev);
  }

  function handleMarcarLeida(n: Notificacion) {
    if (!n.leida) {
      marcarLeida.mutate(n.id);
    }
  }

  return (
    <div className="notification-bell-wrapper" ref={panelRef} style={{ position: "relative" }}>
      <button
        type="button"
        className="button-ghost notification-bell-button"
        aria-label={`Notificaciones${count > 0 ? ` (${count} sin leer)` : ""}`}
        onClick={handleToggle}
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border, #e2e8f0)" }}
      >
        <Bell size={17} strokeWidth={2.1} />
        {count > 0 && (
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              background: "var(--danger, #dc2626)",
              color: "#fff",
              borderRadius: "50%",
              width: 16,
              height: 16,
              fontSize: 10,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 360,
            maxHeight: 480,
            background: "var(--surface, #fff)",
            border: "1px solid var(--border, #e2e8f0)",
            borderRadius: 10,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 9999,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border, #e2e8f0)",
              flexShrink: 0,
            }}
          >
            <strong style={{ fontSize: 14 }}>Notificaciones</strong>
            {count > 0 && (
              <button
                type="button"
                className="button-ghost"
                style={{ fontSize: 12 }}
                onClick={() => marcarTodas.mutate()}
                disabled={marcarTodas.isPending}
              >
                Marcar todas como leidas
              </button>
            )}
          </div>

          <div style={{ overflowY: "auto", flex: 1 }}>
            {listQuery.isLoading && (
              <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--muted)" }}>
                Cargando...
              </div>
            )}
            {!listQuery.isLoading && (!listQuery.data || listQuery.data.length === 0) && (
              <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No tienes notificaciones
              </div>
            )}
            {listQuery.data?.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleMarcarLeida(n)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: n.leida ? "transparent" : "rgba(23,79,159,0.04)",
                  textAlign: "left",
                  cursor: n.leida ? "default" : "pointer",
                  border: "none",
                  borderBottom: "1px solid var(--border, #e2e8f0)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: n.leida ? 400 : 600, fontSize: 13, color: "var(--text)" }}>
                    {n.titulo}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {tiempoRelativo(n.creadoEn)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #64748b)", lineHeight: 1.4 }}>
                  {n.mensaje}
                </p>
                {n.motivo && (
                  <p style={{ margin: "4px 0 0", fontSize: 11, color: "var(--muted)", fontStyle: "italic" }}>
                    Motivo: {n.motivo}
                  </p>
                )}
                <div style={{ marginTop: 4, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, background: "var(--surface-alt, #f1f5f9)", borderRadius: 4, padding: "1px 6px", color: "var(--muted)" }}>
                    {MODULO_LABEL[n.modulo] ?? n.modulo}
                  </span>
                  {n.entidadCodigo && (
                    <span style={{ fontSize: 10, background: "var(--surface-alt, #f1f5f9)", borderRadius: 4, padding: "1px 6px", color: "var(--muted)", fontFamily: "monospace" }}>
                      {n.entidadCodigo}
                    </span>
                  )}
                  {!n.leida && (
                    <span style={{ fontSize: 10, background: "rgba(23,79,159,0.12)", borderRadius: 4, padding: "1px 6px", color: "var(--brand, #174f9f)", fontWeight: 600 }}>
                      Nueva
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
