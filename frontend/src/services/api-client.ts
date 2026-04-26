import axios from "axios";
import { getStoredSession } from "../features/auth/auth-storage";

export const apiClient = axios.create({
  baseURL: "http://localhost:3000/api",
});

apiClient.interceptors.request.use((config) => {
  const session = getStoredSession();

  if (session?.token) {
    config.headers.Authorization = `Bearer ${session.token}`;
  }

  return config;
});
