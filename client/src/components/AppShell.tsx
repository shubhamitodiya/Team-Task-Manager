import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Team Task Manager</p>
          <h1>Keep projects moving.</h1>
          <p className="sidebar-copy">
            Shared visibility for admins, clear execution for members, and one place to track
            deadlines before they slip.
          </p>
        </div>

        <nav className="nav-links">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
        </nav>

        <div className="user-card">
          <div>
            <strong>{user?.name}</strong>
            <p>
              {user?.role} • {user?.email}
            </p>
          </div>
          <button className="ghost-button" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
