import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Executive Overview", end: true },
  { to: "/sales", label: "Sales Analysis" },
  { to: "/inventory", label: "Inventory Analysis" }
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow">DW Executive Analytics</p>
          <h1>OLAP Control Room</h1>
          <p className="muted">
            SSAS-driven analytics for executive reporting, drill-down, and guided exploration.
          </p>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
