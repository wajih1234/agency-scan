import { useState } from 'react';
import { api } from './api.js';

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: the text can still be selected by hand
    }
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 break-all rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-800">{value}</code>
        <button
          type="button"
          onClick={copy}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

export default function VerifyPanel({ site, onVerified }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function check() {
    setError('');
    setBusy(true);
    try {
      const data = await api(`/sites/${site._id}/verify`, { method: 'POST' });
      onVerified(data.site);
    } catch (err) {
      setError(
        err.status === 422
          ? 'We could not find the record yet. DNS changes can take a few minutes, sometimes longer. Check the name and value, then try again.'
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-b-xl border-t border-slate-100 bg-slate-50 p-4">
      <p className="text-sm font-medium text-slate-800">Prove that your client owns {site.domain}</p>
      <p className="mt-1 text-sm text-slate-600">
        Add this TXT record in the DNS settings of the domain (at the registrar or the DNS provider), then click
        "Check now".
      </p>

      <CopyField label="Type" value="TXT" />
      <CopyField label="Name (some providers want only the first part: _agencyscan)" value={`_agencyscan.${site.domain}`} />
      <CopyField label="Value" value={`agencyscan-verify=${site.verificationToken}`} />

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <button
        type="button"
        onClick={check}
        disabled={busy}
        className="mt-4 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
      >
        {busy ? 'Checking...' : 'Check now'}
      </button>
    </div>
  );
}