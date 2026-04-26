import { Link, Outlet } from "react-router-dom";

const navItems = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/rats", label: "RAT" },
  { to: "/rats/new", label: "Nuevo RAT" },
];

export function MainLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-kicker">Gobierno de privacidad</span>
          <h1>Sistema RAT</h1>
        </div>
        <nav className="nav">
          {navItems.map((item) => (
            <Link key={item.to} to={item.to} className="nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
