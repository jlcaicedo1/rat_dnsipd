import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";

type DependenciaRef = { id: number; nombre: string; sigla: string | null };

export type ActividadVersionContext = {
  id: number;
  numeroVersion: string;
  requiereEipd?: boolean;
  actividad: {
    id: number;
    codigo: string;
    nombre: string;
    rat?: { id: number; codigo: string; nombre: string; dependencia?: DependenciaRef | null } | null;
  };
};

export type EipdFormSummary = {
  id: number;
  codigo: string;
  titulo: string | null;
  estado: string;
  createdAt: string;
  updatedAt: string;
  createdByNombre?: string | null;
  createdByDependencia?: DependenciaRef | null;
  actividadVersionId?: number | null;
  actividadVersion?: {
    id: number;
    numeroVersion: string;
    actividad: {
      id: number;
      codigo: string;
      nombre: string;
      rat?: { id: number; codigo: string; dependencia?: DependenciaRef | null } | null;
    };
  } | null;
};

export type EipdFormDoc = EipdFormSummary & {
  formFields: Record<string, string> | null;
  s2State: unknown[] | null;
  s3State: unknown[] | null;
  datosRows: unknown[] | null;
  activosRows: unknown[] | null;
  s4Rows: unknown[] | null;
  s5Rows: unknown[] | null;
  s6Rows: unknown[] | null;
  actividadVersion?: ActividadVersionContext | null;
};

export type EipdFormPatch = Partial<Omit<EipdFormDoc, "id" | "codigo" | "createdAt" | "updatedAt">>;

const QK = {
  list: ["eipd-form"] as const,
  one: (id: number) => ["eipd-form", id] as const,
  byActividad: (actividadVersionId: number) => ["eipd-form", "actividad-version", actividadVersionId] as const,
};

async function fetchList(): Promise<EipdFormSummary[]> {
  const { data } = await apiClient.get<{ data: EipdFormSummary[] }>("/eipd-form");
  return data.data;
}

async function fetchOne(id: number): Promise<EipdFormDoc> {
  const { data } = await apiClient.get<{ data: EipdFormDoc }>(`/eipd-form/${id}`);
  return data.data;
}

async function fetchByActividadVersion(actividadVersionId: number): Promise<EipdFormDoc | null> {
  const { data } = await apiClient.get<{ data: EipdFormDoc | null }>(
    `/actividad-versiones/${actividadVersionId}/eipd-form`,
  );
  return data.data;
}

async function createEipdForm(payload?: { titulo?: string; actividadVersionId?: number }): Promise<EipdFormDoc> {
  const { data } = await apiClient.post<{ data: EipdFormDoc }>("/eipd-form", payload ?? {});
  return data.data;
}

async function patchForm(id: number, payload: EipdFormPatch): Promise<EipdFormDoc> {
  const { data } = await apiClient.patch<{ data: EipdFormDoc }>(`/eipd-form/${id}`, payload);
  return data.data;
}

export function useEipdFormList() {
  return useQuery({ queryKey: QK.list, queryFn: fetchList, staleTime: 30_000 });
}

export function useEipdFormOne(id: number) {
  return useQuery({ queryKey: QK.one(id), queryFn: () => fetchOne(id), staleTime: 30_000, enabled: !!id });
}

export function useEipdFormByActividadVersion(actividadVersionId: number | undefined) {
  return useQuery({
    queryKey: QK.byActividad(actividadVersionId ?? 0),
    queryFn: () => fetchByActividadVersion(actividadVersionId!),
    staleTime: 30_000,
    enabled: !!actividadVersionId,
  });
}

export function useEipdFormCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload?: { titulo?: string; actividadVersionId?: number }) => createEipdForm(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.list }); },
  });
}

export function useEipdFormSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: EipdFormPatch }) =>
      patchForm(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(QK.one(data.id), data);
      qc.invalidateQueries({ queryKey: QK.list });
    },
  });
}

export function useEipdFormDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/eipd-form/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.list }); },
  });
}

// Legacy compat
export function useEipdFormMine() { return useEipdFormList(); }
