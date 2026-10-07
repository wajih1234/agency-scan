import { Link, Outlet } from 'react-router-dom';

export default function Layout({ org, onLogout }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/sites" className="text-lg font-bold text-teal-700">
            Agency Scan
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/settings" className="text-sm font-medium text-slate-600 hover:text-teal-700">
              Settings
            </Link>
            {org && <span className="text-sm text-slate-600">{org.name}</span>}
            <button
              onClick={onLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}