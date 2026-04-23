import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

const navItem = ({ isActive }) =>
  `px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest transition ${
    isActive
      ? "text-ink border-b border-ink"
      : "text-ink-faint hover:text-ink border-b border-transparent"
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line bg-paper-card/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center border border-ink">
              <span className="h-2 w-2 rounded-full bg-ink" />
            </span>
            <span className="font-mono text-sm uppercase tracking-widest text-ink">
              Actitrace
            </span>
            <span className="eyebrow hidden md:inline">/ HAR</span>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={navItem}>
              Dashboard
            </NavLink>
            <NavLink to="/upload" className={navItem}>
              Upload
            </NavLink>
            <NavLink to="/models" className={navItem}>
              Models
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-ink-faint md:flex">
              <span className="dot bg-accent" />
              {user?.email}
              <span className="kbd">{user?.role}</span>
            </span>
            <button onClick={handleLogout} className="btn-ghost">
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Outlet />
      </main>
      <footer className="border-t border-line py-5 text-center">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 font-mono text-[10px] uppercase tracking-widest text-ink-faint">
          <span>Actitrace · UCI HAR · XGBoost</span>
          <span className="flex items-center gap-2">
            <span className="dot bg-ink" />
            system online
          </span>
        </div>
      </footer>
    </div>
  );
}
