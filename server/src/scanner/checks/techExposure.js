import { safeGet } from '../safeGet.js';

// Text copied from a website is untrusted: keep it short, and never insert it as raw HTML in the frontend.
const short = (s) => String(s).slice(0, 80);

export function serverFinding(headers) {
  const value = headers.server ?? '';
  const exposed = /\d+(\.\d+)+/.test(value);
  return {
    checkId: 'tech.server',
    severity: 'low',
    passed: !exposed,
    title: 'Web server version hidden',
    description: exposed
      ? `The server announces its software and version ("${short(value)}"), which helps attackers find known vulnerabilities.`
      : 'The server does not reveal its software version.',
    fix: 'Hide the version in the web server settings (for example server_tokens off in nginx, ServerTokens Prod in Apache).',
  };
}

export function poweredByFinding(headers) {
  const value = headers['x-powered-by'];
  return {
    checkId: 'tech.poweredby',
    severity: 'low',
    passed: !value,
    title: 'X-Powered-By header removed',
    description: value
      ? `The site announces the technology behind it ("${short(value)}"), which helps attackers target it.`
      : 'The site does not announce the technology behind it.',
    fix: 'Remove the X-Powered-By header (for example expose_php = Off for PHP, or app.disable("x-powered-by") in Express).',
  };
}

export function generatorFromHtml(html) {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (/name\s*=\s*["']generator["']/i.test(tag)) {
      const m = /content\s*=\s*["']([^"']*)["']/i.exec(tag);
      if (m) return m[1].trim();
    }
  }
  return null;
}

export function generatorFinding(html) {
  const generator = generatorFromHtml(html);
  const exposed = Boolean(generator) && /\d+\.\d+/.test(generator);
  return {
    checkId: 'tech.generator',
    severity: 'medium',
    passed: !exposed,
    title: 'CMS version hidden in the page source',
    description: exposed
      ? `The page source announces "${short(generator)}", which tells attackers exactly which version to target.`
      : 'The page source does not reveal a software version.',
    fix: 'Remove the generator meta tag, for example with a security plugin or a small theme setting, and keep the CMS and its plugins up to date.',
  };
}

export async function checkTechExposure(domain) {
  try {
    const res = await safeGet(`https://${domain}`);
    return [serverFinding(res.headers), poweredByFinding(res.headers), generatorFinding(res.body)];
  } catch (err) {
    return [
      {
        checkId: 'tech.unreachable',
        severity: 'low',
        passed: false,
        title: 'Software exposure could not be checked',
        description: `We could not load https://${domain} (${err.message}).`,
        fix: 'Make sure the site is online over HTTPS, then scan again.',
      },
    ];
  }
}
