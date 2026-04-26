export type AuditLog = {
  id: number;
  modulo: string;
  entidad: string;
  entidadId: string | null;
  accion: string;
  actor: string | null;
  actorRole: string | null;
  descripcion: string | null;
  detalleAntes: unknown | null;
  detalleDespues: unknown | null;
  metadata: unknown | null;
  fecha: string;
};
