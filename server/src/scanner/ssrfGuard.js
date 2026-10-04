import dns from 'node:dns/promises';
import net from 'node:net';

function isPrivateIPv4(ip) {
  const [a, b] = ip.split('.').map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIPv6(ip) {
  const v = ip.toLowerCase();
  if (v === '::' || v === '::1') return true;
  if (v.startsWith('fc') || v.startsWith('fd')) return true;
  if (/^fe[89ab]/.test(v)) return true;
  if (v.startsWith('::ffff:')) {
    const mapped = v.slice(7);
    return net.isIPv4(mapped) ? isPrivateIPv4(mapped) : true;
  }
  return false;
}

export async function resolvePublicAddresses(host) {
  const results = await dns.lookup(host, { all: true });
  if (!results.length) throw new Error('Domain does not resolve');

  for (const { address, family } of results) {
    const isPrivate = family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address);
    if (isPrivate) throw new Error('Domain resolves to a non-public address');
  }

  return results.map((r) => r.address);
}