import { useState } from 'react';
import { api } from './api.js';
import { Link } from 'react-router-dom';
export default function Login({ onLoggedIn }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/login', { method: 'POST', body: { email, password } });
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.status === 429 ? 'Too many attempts. Please wait a few minutes.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-teal-700">Agency Scan</h1>
      <p className="mt-1 text-sm text-slate-500">Log in to your agency account</p>

      <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
      />

      <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200"
      />

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {busy ? 'Logging in...' : 'Log in'}
      </button>
      <p className="mt-4 text-center text-sm text-slate-500">
        No account yet?{' '}
        <Link to="/register" className="font-medium text-teal-700 hover:underline">
          Create one
        </Link>
      </p>
    </form>
  );
}