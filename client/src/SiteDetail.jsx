import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, downloadFile } from './api.js';
import ScanButton from './ScanButton.jsx';

const SEVERITY = {
  critical: { label: 'Critical', badge: 'bg-red-100 text-red-800', order: 0 },
  high: { label: 'High', badge: 'bg-orange-100 text-orange-800', order: 1 },
  medium: { label: 'Medium', badge: 'bg-amber-100 text-amber-800', order: 2 },
  low: { label: 'Low', badge: 'bg-slate-200 text-slate-700', order: 3 },
};

const scoreColor = (s) => (s >= 80 ? 'text-green-700' : s >= 60 ? 'text-amber-700' : 'text-red-700');

function summaryText(failed) {
  if (failed.length === 0) return 'No issues found.';
  const parts = Object.keys(SEVERITY)
    .map((key) => [key, failed.filter((f) => f.severity === key).length])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${key}`);
  return `${failed.length} issue${failed.length > 1 ? 's' : ''} found: ${parts.join(', ')}.`;
}

export default function SiteDetail() {
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [scan, setScan] = useState(null); // latest finished scan, with its findings
  const [state, setState] = useState('loading'); // loading | ready | notfound | error
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try {
      const { sites } = await api('/sites');
      const found = sites.find((s) => s._id === id);
      if (!found) {
        setState('notfound');
        return;
      }
      setSite(found);

      const { scans } = await api(`/sites/${id}/scans`);
      const latest = scans.find((s) => s.status === 'done' || s.status === 'unreachable');
      setScan(latest ? (await api(`/scans/${latest._id}`)).scan : null);
      setState('ready');
    } catch (err) {
      setLoadError(err.message);
      setState('error');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function download() {
    setActionError('');
    setDownloading(true);
    try {
      await downloadFile(`/scans/${scan._id}/report.pdf`, `security-report-${site.domain}.pdf`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setDownloading(false);
    }
  }

  const back = (
    <Link to="/sites" className="text-sm font-medium text-teal-700 hover:underline">
      &larr; All sites
    </Link>
  );

  if (state === 'loading') return <p className="text-slate-500">Loading...</p>;

  if (state === 'notfound') {
    return (
      <div>
        {back}
        <p className="mt-6 text-slate-600">This site was not found.</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div>
        {back}
        <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
      </div>
    );
  }

  const findings = scan?.findings ?? [];
  const failed = findings
    .filter((f) => !f.passed)
    .sort((a, b) => (SEVERITY[a.severity]?.order ?? 9) - (SEVERITY[b.severity]?.order ?? 9));
  const passed = findings.filter((f) => f.passed);
  const hasScore = typeof scan?.score === 'number';

  return (
    <div>
      {back}

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{site.clientName}</h1>
          <p className="text-slate-500">{site.domain}</p>
        </div>
        <div className="flex items-center gap-3">
          {site.verified && <ScanButton site={site} onDone={() => load()} />}
          {scan && (
            <button
              onClick={download}
              disabled={downloading}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {downloading ? 'Preparing...' : 'Download PDF report'}
            </button>
          )}
        </div>
      </div>

      {actionError && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>}

      {!site.verified && (
        <p className="mt-6 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          This domain is not verified yet. Verify it on the sites page before running a scan.
        </p>
      )}

      {site.verified && !scan && (
        <p className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
          No scan yet. Click "Scan now" to run the first one.
        </p>
      )}

      {scan && (
        <>
          <div className="mt-6 flex flex-wrap items-center gap-6 rounded-xl bg-white p-5 shadow">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Security score</p>
              {hasScore ? (
                <p className={`text-5xl font-bold ${scoreColor(scan.score)}`}>
                  {scan.score}
                  <span className="text-lg font-normal text-slate-400"> / 100</span>
                </p>
              ) : (
                <p className="mt-2 text-xl font-bold text-slate-500">Not available</p>
              )}
            </div>
            <div>
              <p className="text-slate-800">
                {hasScore ? summaryText(failed) : 'We could not open a secure connection to this site, so no score was calculated.'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {findings.length} checks performed, {passed.length} passed. Scanned on{' '}
                {new Date(scan.finishedAt ?? scan.startedAt).toLocaleString()}.
              </p>
            </div>
          </div>

          {scan.complete === false && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Some checks could not be completed, so the score may not reflect every area. Run the scan again to
              confirm.
            </p>
          )}

          {failed.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">Issues to fix</h2>
              <div className="mt-3 space-y-3">
                {failed.map((f, i) => {
                  const sev = SEVERITY[f.severity] ?? { label: f.severity, badge: 'bg-slate-200 text-slate-700' };
                  return (
                    <div key={`${f.checkId}-${i}`} className="rounded-xl bg-white p-4 shadow">
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sev.badge}`}>
                          {sev.label}
                        </span>
                        <p className="font-medium text-slate-900">{f.title}</p>
                      </div>
                      <p className="mt-2 text-sm text-slate-600">{f.description}</p>
                      <p className="mt-2 text-sm text-slate-800">
                        <span className="font-medium">How to fix: </span>
                        {f.fix}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {passed.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-slate-900">Checks passed</h2>
              <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-slate-600">
                {passed.map((f, i) => (
                  <li key={`${f.checkId}-${i}`}>{f.title}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}