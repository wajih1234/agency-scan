export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// these routes never trigger an automatic refresh
const NO_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

let refreshing = null;

function send(path, { method = 'GET', body } = {}) {
  return fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
}

function refreshSession() {
  // refresh tokens work only once, so parallel requests must share a single refresh call
  refreshing ??= send('/auth/refresh', { method: 'POST' })
    .then((res) => res.ok)
    .catch(() => false)
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

export async function api(path, options) {
  let res = await send(path, options);

  if (res.status === 401 && !NO_REFRESH.includes(path) && (await refreshSession())) {
    res = await send(path, options);
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data?.error ?? 'Something went wrong', data?.details);
  return data;
}
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// asks the API every 1.5 seconds until the scan is no longer running (about 90 seconds at most)
export async function waitForScan(id, { intervalMs = 1500, maxTries = 60 } = {}) {
  for (let i = 0; i < maxTries; i++) {
    await sleep(intervalMs);
    const { scan } = await api(`/scans/${id}`);
    if (scan.status !== 'running') return scan;
  }
  throw new Error('The scan is taking longer than expected. Reload the page in a minute.');
}

// downloads a file (for example a PDF report) while keeping the login session alive
export async function downloadFile(path, filename) {
  let res = await send(path);
  if (res.status === 401 && (await refreshSession())) res = await send(path);

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new ApiError(res.status, data?.error ?? 'Download failed');
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}