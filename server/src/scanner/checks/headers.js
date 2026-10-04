import { safeGet } from '../safeGet.js';

const CHECKS = [
  {
    checkId: 'headers.hsts',
    severity: 'high',
    title: 'HSTS (Strict-Transport-Security) header',
    description: 'Tells browsers to always use HTTPS for this site, which blocks downgrade attacks.',
    fix: 'Add the header: Strict-Transport-Security: max-age=31536000; includeSubDomains',
    test: (h) => {
      const m = /max-age=(\d+)/i.exec(h['strict-transport-security'] ?? '');
      return Boolean(m) && Number(m[1]) >= 15552000;
    },
  },
  {
    checkId: 'headers.csp',
    severity: 'medium',
    title: 'Content-Security-Policy header',
    description: 'Limits which scripts and resources a page may load, which reduces the impact of injected code (XSS).',
    fix: "Add a Content-Security-Policy header. A simple start is: default-src 'self'",
    test: (h) => Boolean(h['content-security-policy']),
  },
  {
    checkId: 'headers.nosniff',
    severity: 'medium',
    title: 'X-Content-Type-Options header',
    description: 'Stops browsers from guessing file types, which prevents some content-confusion attacks.',
    fix: 'Add the header: X-Content-Type-Options: nosniff',
    test: (h) => (h['x-content-type-options'] ?? '').toLowerCase().includes('nosniff'),
  },
  {
    checkId: 'headers.clickjacking',
    severity: 'medium',
    title: 'Clickjacking protection',
    description: 'Prevents other websites from displaying this site inside a hidden frame to trick visitors into clicking.',
    fix: "Add the header X-Frame-Options: SAMEORIGIN, or a CSP rule: frame-ancestors 'self'",
    test: (h) =>
      Boolean(h['x-frame-options']) || /frame-ancestors/i.test(h['content-security-policy'] ?? ''),
  },
  {
    checkId: 'headers.referrer',
    severity: 'low',
    title: 'Referrer-Policy header',
    description: 'Controls how much of the page address is shared with other sites when visitors click a link.',
    fix: 'Add the header: Referrer-Policy: strict-origin-when-cross-origin',
    test: (h) => Boolean(h['referrer-policy']),
  },
  {
    checkId: 'headers.permissions',
    severity: 'low',
    title: 'Permissions-Policy header',
    description: 'Restricts browser features such as camera, microphone, and location for this site.',
    fix: 'Add the header: Permissions-Policy: camera=(), microphone=(), geolocation=()',
    test: (h) => Boolean(h['permissions-policy']),
  },
];

export async function checkHeaders(domain) {
  let res;
  try {
    res = await safeGet(`https://${domain}`);
  } catch (err) {
    return [
      {
        checkId: 'headers.unreachable',
        severity: 'high',
        passed: false,
        title: 'Site not reachable over HTTPS',
        description: `We could not load https://${domain} (${err.message}).`,
        fix: 'Make sure the site is online and has a valid HTTPS certificate.',
      },
    ];
  }

  return CHECKS.map(({ test, ...meta }) => ({ ...meta, passed: test(res.headers) }));
}