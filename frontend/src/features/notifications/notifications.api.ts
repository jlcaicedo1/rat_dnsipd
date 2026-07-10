import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";

export type Notificacion = {
  id: number;
  tipo: string;
  modulo: string;
  titulo: string;
  mensaje: string;
  motivo: string | null;
  de: string;
  entidadId: number | null;
  entidadCodigo: string | null;
  leida: boolean;
  creadoEn: string;
};

const QK = {
  list: ["notificaciones"] as const,
  count: ["notificaciones", "count"] as const,
};

export function useNotificaciones() {
  return useQuery({
    queryKey: QK.list,
    queryFn: async () => {
      const { data } = await apiClient.get<{ data: Notificacion[] }>("/notificaciones");
      return data.data;
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });
}

export function useNotificacionesCount() {
  return useQuery({
    queryKey: QK.count,
    queryFn: async () => {
      const { data } = await apiClient.get<{ count: number }>("/notificaciones/no-leidas/count");
      return data.count;
    },
    staleTime: 0,
    refetchInterval: 30_000,
  });
}

export function useMarcarLeida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.patch(`/notificaciones/${id}/leer`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.list });
      void qc.invalidateQueries({ queryKey: QK.count });
    },
  });
}

export function useMarcarTodasLeidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.patch("/notificaciones/leer-todas"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: QK.list });
      void qc.invalidateQueries({ queryKey: QK.count });
    },
  });
}
