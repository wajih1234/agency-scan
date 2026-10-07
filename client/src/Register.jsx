import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from './api.js';

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200';

export default function Register({ onRegistered }) {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const data = await api('/auth/register', { method: 'POST', body: { orgName, email, password } });
      onRegistered(data.user);
    } catch (err) {
      if (err.status === 429) {
        setError('Too many sign-ups from this network. Please try again later.');
      } else if (err.status === 400 && err.details?.length) {
        setError(err.details.map((d) => `${d.field}: ${d.message}`).join(' / '));
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-sm rounded-xl bg-white p-8 shadow">
      <h1 className="text-2xl font-bold text-teal-700">Agency Scan</h1>
      <p className="mt-1 text-sm text-slate-500">Create your agency account</p>

      <label className="mt-6 block text-sm font-medium text-slate-700" htmlFor="orgName">
        Agency name
      </label>
      <input
        id="orgName"
        type="text"
        autoComplete="organization"
        required
        minLength={2}
        maxLength={100}
        value={orgName}
        onChange={(e) => setOrgName(e.target.value)}
        className={inputClass}
      />

      <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={inputClass}
      />

      <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="password">
        Password
      </label>
      <input
        id="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={10}
        maxLength={128}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={inputClass}
      />
      <p className="mt-1 text-xs text-slate-500">At least 10 characters.</p>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 w-full rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {busy ? 'Creating account...' : 'Create account'}
      </button>

      <p className="mt-4 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-teal-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}