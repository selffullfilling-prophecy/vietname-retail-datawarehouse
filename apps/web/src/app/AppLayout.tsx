import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Tổng quan", end: true },
  { to: "/sales", label: "Phân tích bán hàng" },
  { to: "/inventory", label: "Phân tích tồn kho" },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <h1>Hệ thống quản trị điều hành</h1>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
