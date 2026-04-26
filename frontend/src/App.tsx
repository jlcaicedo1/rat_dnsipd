import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./router/AppRouter";
import { useAuthStore } from "./features/auth/auth-store";

export function App() {
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  );
}
