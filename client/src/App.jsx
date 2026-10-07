import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { api } from './api.js';
import Login from './Login.jsx';
import Register from './Register.jsx';
import Layout from './Layout.jsx';
import Sites from './Sites.jsx';
import SiteDetail from './SiteDetail.jsx';
import Settings from './Settings.jsx';
function Shell({ children }) {
  return <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">{children}</div>;
}

export default function App() {
  // undefined = still checking, null = logged out, object = logged in
  const [user, setUser] = useState(undefined);
  const [org, setOrg] = useState(null);

  useEffect(() => {
    api('/auth/me')
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (!user) {
      setOrg(null);
      return;
    }
    api('/org')
      .then((data) => setOrg(data.org))
      .catch(() => setOrg(null));
  }, [user]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    setUser(null);
  }

  if (user === undefined) {
    return (
      <Shell>
        <p className="text-slate-500">Loading...</p>
      </Shell>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? (
            <Navigate to="/sites" replace />
          ) : (
            <Shell>
              <Login onLoggedIn={setUser} />
            </Shell>
          )
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/sites" replace />
          ) : (
            <Shell>
              <Register onRegistered={setUser} />
            </Shell>
          )
        }
      />
      <Route element={user ? <Layout org={org} onLogout={logout} /> : <Navigate to="/login" replace />}>
        <Route path="/sites" element={<Sites />} />
                <Route path="/sites/:id" element={<SiteDetail />} />
                        <Route path="/settings" element={<Settings org={org} onSaved={setOrg} />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? '/sites' : '/login'} replace />} />
    </Routes>
  );
}