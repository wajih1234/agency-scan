import { useEffect, useState } from 'react';
import { api } from './api.js';

const MAX_LOGO_BYTES = 50 * 1024;

const inputClass =
  'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-200';

// picks black or white text, whichever is readable on the brand color (same rule as the PDF report)
function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#111827' : '#ffffff';
}

const readFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });

export default function Settings({ org, onSaved }) {
  const [name, setName] = useState('');
  const [brandColor, setBrandColor] = useState('#1d4ed8');
  const [logo, setLogo] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  // fill the form once the agency data has arrived
  useEffect(() => {
    if (!org) return;
    setName(org.name);
    setBrandColor(org.brandColor);
    setLogo(org.logo ?? null);
  }, [org]);

  async function pickLogo(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    setSaved(false);

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError('The logo must be a PNG or JPEG image.');
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError('The logo is too large. The maximum size is 50 KB.');
      return;
    }
    try {
      setLogo(await readFile(file));
    } catch (err) {
      setError(err.message);
    }
  }

  async function save(e) {
    e.preventDefault();
    setError('');
    setSaved(false);
    setBusy(true);
    try {
      const data = await api('/org', { method: 'PATCH', body: { name, brandColor, logo } });
      onSaved(data.org);
      setSaved(true);
    } catch (err) {
      if (err.status === 400 && err.details?.length) {
        setError(err.details.map((d) => `${d.field}: ${d.message}`).join(' / '));
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
    }
  }

  if (!org) return <p className="text-slate-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Report branding</h1>
      <p className="mt-1 text-sm text-slate-500">Your name, color, and logo appear on the PDF reports you give to clients.</p>

      <form onSubmit={save} className="mt-6 rounded-xl bg-white p-5 shadow">
        <label className="block text-sm font-medium text-slate-700" htmlFor="name">
          Agency name
        </label>
        <input
          id="name"
          required
          minLength={2}
          maxLength={100}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setSaved(false);
          }}
          className={inputClass}
        />

        <label className="mt-4 block text-sm font-medium text-slate-700" htmlFor="color">
          Brand color
        </label>
        <div className="mt-1 flex items-center gap-3">
          <input
            id="color"
            type="color"
            value={brandColor}
            onChange={(e) => {
              setBrandColor(e.target.value);
              setSaved(false);
            }}
            className="h-10 w-16 cursor-pointer rounded border border-slate-300 bg-white p-1"
          />
          <code className="text-sm text-slate-600">{brandColor}</code>
        </div>

        <p className="mt-4 text-sm font-medium text-slate-700">Logo</p>
        <div className="mt-1 flex items-center gap-3">
          {logo && (
            <img
              src={logo}
              alt="Your logo"
              className="h-12 w-auto max-w-[140px] rounded border border-slate-200 object-contain p-1"
            />
          )}
          <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {logo ? 'Change logo' : 'Upload logo'}
            <input type="file" accept="image/png,image/jpeg" onChange={pickLogo} className="hidden" />
          </label>
          {logo && (
            <button
              type="button"
              onClick={() => {
                setLogo(null);
                setSaved(false);
              }}
              className="text-sm font-medium text-slate-500 hover:text-red-700"
            >
              Remove
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-slate-500">PNG or JPEG, 50 KB maximum.</p>

        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {saved && <p className="mt-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">Saved.</p>}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? 'Saving...' : 'Save'}
        </button>
      </form>

      <p className="mt-8 text-sm font-medium text-slate-700">Preview of the report header</p>
      <div
        className="mt-2 flex items-center gap-4 rounded-lg px-5 py-4"
        style={{ backgroundColor: brandColor, color: readableOn(brandColor) }}
      >
        {logo && <img src={logo} alt="" className="h-11 w-auto max-w-[110px] object-contain" />}
        <span className="text-xl font-bold">{name || 'Your agency'}</span>
      </div>
    </div>
  );
}