import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../services/api-client";

export type ChecklistDpdSummary = {
  id: number;
  codigo: string;
  titulo: string | null;
  estado: string;
  createdAt: string;
  updatedAt: string;
  createdByNombre?: string | null;
};

export type ChecklistDpdDoc = ChecklistDpdSummary & {
  formData: Record<string, string> | null;
  controles: unknown | null;
  planRows: unknown[] | null;
};

export type ChecklistDpdPatch = Partial<Omit<ChecklistDpdDoc, "id" | "codigo" | "createdAt" | "updatedAt">>;

const QK = {
  list: ["checklist-dpd"] as const,
  one: (id: number) => ["checklist-dpd", id] as const,
};

async function fetchList(): Promise<ChecklistDpdSummary[]> {
  const { data } = await apiClient.get<{ data: ChecklistDpdSummary[] }>("/checklist-dpd");
  return data.data;
}

async function fetchOne(id: number): Promise<ChecklistDpdDoc> {
  const { data } = await apiClient.get<{ data: ChecklistDpdDoc }>(`/checklist-dpd/${id}`);
  return data.data;
}

async function createChecklist(titulo?: string): Promise<ChecklistDpdDoc> {
  const { data } = await apiClient.post<{ data: ChecklistDpdDoc }>("/checklist-dpd", { titulo });
  return data.data;
}

async function patchChecklist(id: number, payload: ChecklistDpdPatch): Promise<ChecklistDpdDoc> {
  const { data } = await apiClient.patch<{ data: ChecklistDpdDoc }>(`/checklist-dpd/${id}`, payload);
  return data.data;
}

export function useChecklistDpdList() {
  return useQuery({ queryKey: QK.list, queryFn: fetchList, staleTime: 30_000 });
}

export function useChecklistDpdOne(id: number) {
  return useQuery({ queryKey: QK.one(id), queryFn: () => fetchOne(id), staleTime: 30_000, enabled: !!id });
}

export function useChecklistDpdCreate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (titulo?: string) => createChecklist(titulo),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.list }); },
  });
}

export function useChecklistDpdSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ChecklistDpdPatch }) =>
      patchChecklist(id, payload),
    onSuccess: (data) => {
      qc.setQueryData(QK.one(data.id), data);
      qc.invalidateQueries({ queryKey: QK.list });
    },
  });
}

export function useChecklistDpdDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete(`/checklist-dpd/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QK.list }); },
  });
}

// Legacy compat
export function useChecklistDpdMine() { return useChecklistDpdList(); }
