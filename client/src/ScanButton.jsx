import { useState } from 'react';
import { api, waitForScan } from './api.js';

export default function ScanButton({ site, onDone }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function scan() {
    setMessage('');
    setBusy(true);
    try {
      const started = await api(`/sites/${site._id}/scans`, { method: 'POST' });
      const result = await waitForScan(started.scan._id);
      onDone(site._id, { lastScore: result.score, lastScanAt: result.finishedAt });
      if (result.status === 'unreachable') setMessage('Could not connect to the site over HTTPS.');
      else if (result.status === 'failed') setMessage('The scan failed. Please try again.');
    } catch (err) {
      setMessage(err.status === 409 ? 'A scan is already running for this site.' : err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {message && <span className="max-w-48 text-xs text-red-700">{message}</span>}
      <button
        onClick={scan}
        disabled={busy}
        className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {busy ? 'Scanning...' : 'Scan now'}
      </button>
    </>
  );
}