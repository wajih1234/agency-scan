import dns from 'node:dns/promises';

async function txtRecords(name) {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((chunks) => chunks.join(''));
  } catch (err) {
    if (['ENODATA', 'ENOTFOUND'].includes(err.code)) return [];
    throw err;
  }
}

export function spfFinding(records) {
  const base = {
    checkId: 'email.spf',
    severity: 'medium',
    title: 'SPF record (email sender protection)',
    fix: 'Add a TXT record on the domain that lists the servers allowed to send your email and ends with ~all or -all. Example: v=spf1 include:_spf.google.com ~all',
  };

  if (records.length === 0) {
    return { ...base, passed: false, description: 'No SPF record found, so anyone can more easily send fake emails that look like they come from this domain.' };
  }
  if (records.length > 1) {
    return { ...base, passed: false, description: 'More than one SPF record was found. Receiving servers treat this as an error and may ignore SPF completely.' };
  }
  if (/\s[+?]?all(\s|$)/i.test(records[0])) {
    return { ...base, passed: false, description: 'The SPF record ends by allowing every sender (+all, ?all, or all), which gives no real protection.' };
  }
  return { ...base, passed: true, description: 'A valid SPF record is published.' };
}

export function dmarcFindings(records) {
  const existsBase = {
    checkId: 'email.dmarc',
    severity: 'medium',
    title: 'DMARC record (email spoofing policy)',
    fix: 'Add a TXT record named _dmarc.yourdomain with: v=DMARC1; p=none; rua=mailto:you@yourdomain. Later, move to p=quarantine or p=reject once the reports look clean.',
  };

  if (records.length === 0) {
    return [
      { ...existsBase, passed: false, description: 'No DMARC record found, so receiving servers have no instructions for emails that fail the checks.' },
    ];
  }

  const policy = /;\s*p=(\w+)/i.exec(records[0])?.[1]?.toLowerCase();
  const enforcing = policy === 'quarantine' || policy === 'reject';

  return [
    { ...existsBase, passed: true, description: 'A DMARC record is published.' },
    {
      checkId: 'email.dmarcPolicy',
      severity: 'low',
      passed: enforcing,
      title: 'DMARC policy enforcement',
      description: enforcing
        ? `The DMARC policy is "${policy}", so fake emails are blocked or sent to spam.`
        : 'The DMARC policy only monitors (p=none), so fake emails are still delivered.',
      fix: 'Once the DMARC reports look clean, change p=none to p=quarantine, then to p=reject.',
    },
  ];
}

export async function checkEmailRecords(domain) {
  try {
    const [txt, dmarcTxt] = await Promise.all([txtRecords(domain), txtRecords(`_dmarc.${domain}`)]);
    const spf = txt.filter((r) => /^v=spf1(\s|$)/i.test(r));
    const dmarc = dmarcTxt.filter((r) => /^v=DMARC1\s*;/i.test(r));
    return [spfFinding(spf), ...dmarcFindings(dmarc)];
  } catch (err) {
    return [
      {
        checkId: 'email.unreachable',
        severity: 'low',
        passed: false,
        title: 'Email records check could not run',
        description: `We could not read the DNS records for ${domain} (${err.code ?? err.message}).`,
        fix: 'Try the scan again in a few minutes.',
      },
    ];
  }
}
