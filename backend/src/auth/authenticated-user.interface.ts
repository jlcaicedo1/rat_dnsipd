export type AuthenticatedUser = {
  sub: number;
  username: string;
  role: string;
  nombre?: string;
  dependenciaId?: number | null;
  subdireccionId?: number | null;
};
