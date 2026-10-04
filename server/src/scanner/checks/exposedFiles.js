import { safeGet } from '../safeGet.js';

const isHtml = (res) => String(res.headers['content-type'] ?? '').includes('text/html');

export const RULES = [
  {
    id: 'env',
    path: '/.env',
    severity: 'critical',
    title: 'Environment file exposed (.env)',
    description: 'The file /.env is publicly readable. It usually contains passwords and API keys.',
    fix: 'Block access to this file in the web server settings, then change every password and key it contained.',
    test: (res) => !isHtml(res) && /^[A-Z][A-Z0-9_]*\s*=/m.test(res.body),
  },
  {
    id: 'git',
    path: '/.git/config',
    severity: 'critical',
    title: 'Git repository exposed (.git)',
    description: 'The /.git folder is publicly readable, which can let anyone download the full source code.',
    fix: 'Block access to /.git in the web server settings and remove the folder from the live server.',
    test: (res) => res.body.includes('[core]'),
  },
  {
    id: 'sql',
    path: '/backup.sql',
    severity: 'critical',
    title: 'Database backup exposed (backup.sql)',
    description: 'A database backup is publicly downloadable. It can contain customer data.',
    fix: 'Delete the file from the web server and store backups outside the public folder.',
    test: (res) => !isHtml(res) && /(CREATE TABLE|INSERT INTO|DROP TABLE)/i.test(res.body),
  },
  {
    id: 'wpconfig',
    path: '/wp-config.php.bak',
    severity: 'critical',
    title: 'WordPress configuration backup exposed',
    description: 'A copy of wp-config.php is readable. It contains the database password.',
    fix: 'Delete the backup file and change the database password.',
    test: (res) => /DB_PASSWORD|DB_NAME/.test(res.body),
  },
  {
    id: 'zip',
    path: '/backup.zip',
    severity: 'high',
    title: 'Site archive exposed (backup.zip)',
    description: 'An archive file is publicly downloadable. It may contain source code or data.',
    fix: 'Delete the file from the web server and store backups outside the public folder.',
    test: (res) => !isHtml(res) && res.body.startsWith('PK'),
  },
  {
    id: 'phpinfo',
    path: '/phpinfo.php',
    severity: 'high',
    title: 'PHP information page exposed (phpinfo.php)',
    description: 'This page reveals server details that help attackers plan targeted attacks.',
    fix: 'Delete phpinfo.php from the live server.',
    test: (res) => /phpinfo\(\)|PHP Version/i.test(res.body),
  },
];

export const isExposed = (rule, res) => res.status === 200 && rule.test(res);

export async function checkExposedFiles(domain) {
  const outcomes = await Promise.all(
    RULES.map(async (rule) => {
      try {
        const res = await safeGet(`https://${domain}${rule.path}`);
        return { rule, exposed: isExposed(rule, res) };
      } catch {
        return { rule, error: true };
      }
    }),
  );

  if (outcomes.every((o) => o.error)) {
    return [
      {
        checkId: 'exposed.unreachable',
        severity: 'low',
        passed: false,
        title: 'Sensitive files check could not run',
        description: `We could not reach https://${domain} to check for exposed files.`,
        fix: 'Make sure the site is online over HTTPS, then scan again.',
      },
    ];
  }

  const exposed = outcomes.filter((o) => o.exposed);

  if (exposed.length === 0) {
    return [
      {
        checkId: 'exposed.none',
        severity: 'high',
        passed: true,
        title: 'No sensitive files exposed',
        description: `We checked ${RULES.length} common sensitive file paths and none were publicly accessible.`,
        fix: 'No action needed.',
      },
    ];
  }

  return exposed.map(({ rule }) => ({
    checkId: `exposed.${rule.id}`,
    severity: rule.severity,
    passed: false,
    title: rule.title,
    description: rule.description,
    fix: rule.fix,
  }));
}