import { checkHeaders } from './checks/headers.js';
import { checkSsl } from './checks/ssl.js';
import { checkExposedFiles } from './checks/exposedFiles.js';
import { checkEmailRecords } from './checks/emailRecords.js';
import { checkRedirectsAndCookies } from './checks/redirectsCookies.js';
import { checkTechExposure } from './checks/techExposure.js';

const CHECKS = [
  ['headers', checkHeaders],
  ['ssl', checkSsl],
  ['exposed files', checkExposedFiles],
  ['email records', checkEmailRecords],
  ['redirects and cookies', checkRedirectsAndCookies],
  ['software exposure', checkTechExposure],
];

const PENALTY = { critical: 30, high: 12, medium: 6, low: 2 };
const CHECK_TIMEOUT_MS = 45_000;

export function computeScore(findings) {
  const lost = findings
    .filter((f) => !f.passed)
    .reduce((sum, f) => sum + (PENALTY[f.severity] ?? 0), 0);
  return Math.max(0, 100 - lost);
}

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('timed out')), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function runScan(domain) {
  const startedAt = new Date();

  const results = await Promise.all(
    CHECKS.map(async ([name, check]) => {
      try {
        return await withTimeout(check(domain), CHECK_TIMEOUT_MS);
      } catch (err) {
        return [
          {
            checkId: `${name.replace(/\s+/g, '-')}.failed`,
            severity: 'low',
            passed: false,
            title: `The ${name} check did not complete`,
            description: `This check stopped before finishing (${err.message}).`,
            fix: 'Run the scan again.',
          },
        ];
      }
    }),
  );

  const findings = results.flat();
  const unreachable = findings.some((f) => f.checkId === 'ssl.unreachable');

  return {
    domain,
    status: unreachable ? 'unreachable' : 'done',
    score: unreachable ? null : computeScore(findings),
    complete: !findings.some((f) => /\.(unreachable|failed)$/.test(f.checkId)),
    findings,
    startedAt,
    finishedAt: new Date(),
  };
}