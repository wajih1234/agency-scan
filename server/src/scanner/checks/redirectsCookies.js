import { safeGet } from '../safeGet.js';

export function redirectFinding(finalUrl) {
  const passed = finalUrl.startsWith('https://');
  return {
    checkId: 'http.redirect',
    severity: 'high',
    passed,
    title: 'HTTP redirects to HTTPS',
    description: passed
      ? 'Visitors who type the plain http:// address are sent to the secure https:// version.'
      : 'The plain http:// address does not redirect to HTTPS, so visitors can end up on an unencrypted page.',
    fix: 'Configure the web server to redirect every http:// request to https:// with a permanent (301) redirect.',
  };
}

function parseCookie(line) {
  const [nameValue, ...attrs] = line.split(';').map((s) => s.trim());
  const flags = attrs.map((a) => a.toLowerCase());
  return {
    name: nameValue.split('=')[0],
    secure: flags.includes('secure'),
    httpOnly: flags.includes('httponly'),
    sameSite: flags.some((a) => a.startsWith('samesite=')),
  };
}

const COOKIE_RULES = [
  {
    checkId: 'cookies.secure',
    key: 'secure',
    severity: 'medium',
    title: 'Cookies use the Secure flag',
    ok: 'Every cookie set by the homepage is only sent over HTTPS.',
    bad: 'These cookies can also travel over unencrypted connections',
    fix: 'Add the Secure flag to every cookie.',
  },
  {
    checkId: 'cookies.httponly',
    key: 'httpOnly',
    severity: 'low',
    title: 'Cookies use the HttpOnly flag',
    ok: 'Scripts on the page cannot read the cookies set by the homepage.',
    bad: 'Scripts on the page can read these cookies, which makes session theft easier if the site has an XSS flaw',
    fix: 'Add the HttpOnly flag to session and login cookies.',
  },
  {
    checkId: 'cookies.samesite',
    key: 'sameSite',
    severity: 'low',
    title: 'Cookies use the SameSite attribute',
    ok: 'Every cookie set by the homepage declares a SameSite policy.',
    bad: 'These cookies do not declare a SameSite policy',
    fix: 'Add SameSite=Lax (or Strict) to cookies.',
  },
];

export function cookieFindings(setCookieHeaders = []) {
  const cookies = setCookieHeaders.map(parseCookie);

  if (cookies.length === 0) {
    return [
      {
        checkId: 'cookies.none',
        severity: 'low',
        passed: true,
        title: 'Cookie flags',
        description: 'The homepage sets no cookies, so there is nothing to check.',
        fix: 'No action needed.',
      },
    ];
  }

  return COOKIE_RULES.map((rule) => {
    const missing = cookies.filter((c) => !c[rule.key]).map((c) => c.name);
    const passed = missing.length === 0;
    return {
      checkId: rule.checkId,
      severity: rule.severity,
      passed,
      title: rule.title,
      description: passed ? rule.ok : `${rule.bad}: ${missing.slice(0, 5).join(', ')}.`,
      fix: rule.fix,
    };
  });
}

export async function checkRedirectsAndCookies(domain) {
  const findings = [];

  try {
    const res = await safeGet(`http://${domain}`);
    findings.push(redirectFinding(res.finalUrl));
  } catch (err) {
    findings.push({
      checkId: 'http.unreachable',
      severity: 'low',
      passed: false,
      title: 'HTTP to HTTPS redirect could not be checked',
      description: `We could not load http://${domain} (${err.message}).`,
      fix: 'Make sure the site answers on port 80 and redirects to HTTPS.',
    });
  }

  try {
    const res = await safeGet(`https://${domain}`);
    findings.push(...cookieFindings(res.headers['set-cookie']));
  } catch (err) {
    findings.push({
      checkId: 'cookies.unreachable',
      severity: 'low',
      passed: false,
      title: 'Cookie flags could not be checked',
      description: `We could not load https://${domain} (${err.message}).`,
      fix: 'Make sure the site is online over HTTPS, then scan again.',
    });
  }

  return findings;
}