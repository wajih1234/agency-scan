import { useEffect, useState } from 'react';
import { api } from './api.js';
import VerifyPanel from './VerifyPanel.jsx';
import ScanButton from './ScanButton.jsx';
import { Link } from 'react-router-dom';
const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200';

const scoreColor = (s) => (s >= 80 ? 'text-green-700' : s >= 60 ? 'text-amber-700' : 'text-red-700');

export default function Sites() {
  const [sites, setSites] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [domain, setDomain] = useState('');
  const [clientName, setClientName] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [openId, setOpenId] = useState(null);

  useEffect(() => {
    api('/sites')
      .then((data) => setSites(data.sites))
      .catch((err) => setLoadError(err.message));
  }, []);

  async function addSite(e) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    try {
      const data = await api('/sites', { method: 'POST', body: { domain, clientName } });
      setSites((current) => [data.site, ...(current ?? [])]);
      setDomain('');
      setClientName('');
    } catch (err) {
      if (err.status === 400) {
        setFormError('Please enter a valid domain, for example client-site.com');
      } else {
        setFormError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function markVerified(updated) {
    setSites((current) => current.map((s) => (s._id === updated._id ? updated : s)));
    setOpenId(null);
  }
    function updateSite(id, patch) {
    setSites((current) => current.map((s) => (s._id === id ? { ...s, ...patch } : s)));
  }

  async function removeSite(site) {
    if (!window.confirm(`Delete ${site.domain}? This cannot be undone.`)) return;
    try {
      await api(`/sites/${site._id}`, { method: 'DELETE' });
      setSites((current) => current.filter((s) => s._id !== site._id));
    } catch (err) {
      setLoadError(err.message);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your clients' websites</h1>
      <p className="mt-1 text-sm text-slate-500">Add a site, then verify that you own it before scanning.</p>

      <form onSubmit={addSite} className="mt-6 rounded-xl bg-white p-5 shadow">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            aria-label="Client name"
            placeholder="Client name"
            required
            maxLength={100}
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className={inputClass}
          />
          <input
            aria-label="Domain"
            placeholder="client-site.com"
            required
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {busy ? 'Adding...' : 'Add site'}
          </button>
        </div>
        {formError && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
      </form>

      {loadError && <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>}

      <div className="mt-6 space-y-3">
        {sites === null && !loadError && <p className="text-slate-500">Loading...</p>}

        {sites?.length === 0 && (
          <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
            No sites yet. Add your first client's website above.
          </p>
        )}

        {sites?.map((site) => (
          <div key={site._id} className="rounded-xl bg-white shadow">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-slate-900">{site.clientName}</p>
                <p className="text-sm text-slate-500">{site.domain}</p>
                                {site.lastScanAt && (
                  <p className="text-xs text-slate-400">Last scan: {new Date(site.lastScanAt).toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-4">
                {typeof site.lastScore === 'number' && (
                  <span className={`text-lg font-bold ${scoreColor(site.lastScore)}`}>{site.lastScore}</span>
                )}
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    site.verified ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {site.verified ? 'Verified' : 'Not verified'}
                </span>
                                {site.verified && <ScanButton site={site} onDone={updateSite} />}
                                                {site.lastScanAt && (
                  <Link to={`/sites/${site._id}`} className="text-sm font-medium text-teal-700 hover:underline">
                    Report
                  </Link>
                )}
                {!site.verified && (
                  <button
                    onClick={() => setOpenId(openId === site._id ? null : site._id)}
                    className="text-sm font-medium text-teal-700 hover:underline"
                  >
                    {openId === site._id ? 'Hide' : 'Verify'}
                  </button>
                )}
                <button
                  onClick={() => removeSite(site)}
                  className="text-sm font-medium text-slate-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            {!site.verified && openId === site._id && <VerifyPanel site={site} onVerified={markVerified} />}
          </div>
        ))}
      </div>
    </div>
  );
}