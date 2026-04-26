import { Navigate, Route, Routes } from "react-router-dom";
import { MainLayout } from "../layouts/MainLayout";
import { LoginPage } from "../features/auth/LoginPage";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { RatListPage } from "../features/rat/RatListPage";
import { RatCreatePage } from "../features/rat/RatCreatePage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={<MainLayout />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="rats" element={<RatListPage />} />
        <Route path="rats/new" element={<RatCreatePage />} />
      </Route>
    </Routes>
  );
}
