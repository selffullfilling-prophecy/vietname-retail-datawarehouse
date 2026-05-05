import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Tổng quan điều hành", end: true },
  { to: "/sales", label: "Doanh thu" },
  { to: "/inventory", label: "Tồn kho" },
];

export function AppLayout() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-block">
          <h1>Hệ thống quản trị điều hành</h1>
          <span>Trung tâm phân tích bán lẻ</span>
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
