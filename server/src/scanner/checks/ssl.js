import tls from 'node:tls';
import { resolvePublicAddresses } from '../ssrfGuard.js';

const TIMEOUT_MS = 8000;

function getCertificate(domain, address) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host: address,
        port: 443,
        servername: domain,
        rejectUnauthorized: false, // we want to read bad certificates too, then report them
        timeout: TIMEOUT_MS,
      },
      () => {
        const cert = socket.getPeerCertificate();
        const result = {
          authorized: socket.authorized,
          error: socket.authorizationError ? String(socket.authorizationError) : null,
          validTo: cert?.valid_to ? new Date(cert.valid_to) : null,
          protocol: socket.getProtocol(),
        };
        socket.end();
        resolve(result);
      },
    );
    socket.on('timeout', () => socket.destroy(new Error('Connection timed out')));
    socket.on('error', reject);
  });
}

export async function checkSsl(domain) {
  let info;
  try {
    const [address] = await resolvePublicAddresses(domain);
    info = await getCertificate(domain, address);
  } catch (err) {
    return [
      {
        checkId: 'ssl.unreachable',
        severity: 'high',
        passed: false,
        title: 'HTTPS connection failed',
        description: `We could not open a secure connection to ${domain} (${err.message}).`,
        fix: 'Make sure the site is online and serves HTTPS on port 443 with a valid certificate.',
      },
    ];
  }

  const daysLeft = info.validTo ? Math.floor((info.validTo - Date.now()) / 86_400_000) : null;

  let expiryText = 'The expiry date could not be read.';
  if (daysLeft !== null) {
    expiryText =
      daysLeft < 0
        ? `The certificate expired ${-daysLeft} days ago.`
        : `The certificate expires in ${daysLeft} days.`;
  }

  return [
    {
      checkId: 'ssl.valid',
      severity: 'high',
      passed: info.authorized,
      title: 'Valid SSL certificate',
      description: info.authorized
        ? 'The certificate is trusted and matches the domain.'
        : `Browsers will show a security warning to visitors (${info.error}).`,
      fix: "Install a valid certificate that matches the domain, for example a free one from Let's Encrypt.",
    },
    {
      checkId: 'ssl.expiry',
      severity: 'high',
      passed: daysLeft !== null && daysLeft >= 14,
      title: 'Certificate expiry',
      description: expiryText,
      fix: 'Renew the certificate now and turn on automatic renewal.',
    },
    {
      checkId: 'ssl.protocol',
      severity: 'low',
      passed: ['TLSv1.2', 'TLSv1.3'].includes(info.protocol),
      title: 'Modern TLS version',
      description: `The connection used ${info.protocol}.`,
      fix: 'Disable TLS 1.0 and 1.1 on the server.',
    },
  ];
}