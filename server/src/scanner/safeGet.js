import https from 'node:https';
import http from 'node:http';
import { resolvePublicAddresses } from './ssrfGuard.js';

const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;
const MAX_BODY = 200_000;

function requestOnce(url, address) {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === 'https:' ? https : http;
    const family = address.includes(':') ? 6 : 4;

    const req = lib.request(
      url,
      {
        method: 'GET',
        timeout: TIMEOUT_MS,
        headers: { 'User-Agent': 'AgencyScanBot/1.0', Accept: '*/*' },
        lookup: (hostname, options, cb) => {
          if (options?.all) return cb(null, [{ address, family }]);
          cb(null, address, family);
        },
      },
      (res) => {
        const chunks = [];
        let size = 0;
        let finished = false;

        const finish = () => {
          if (finished) return;
          finished = true;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        };

        res.on('data', (chunk) => {
          size += chunk.length;
          chunks.push(chunk);
          if (size > MAX_BODY) {
            finish();
            res.destroy();
          }
        });
        res.on('end', finish);
        res.on('close', finish);
        res.on('error', finish);
      },
    );

    req.on('timeout', () => req.destroy(new Error('Request timed out')));
    req.on('error', reject);
    req.end();
  });
}

export async function safeGet(startUrl) {
  let url = new URL(startUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported protocol');
    if (url.port && !['80', '443'].includes(url.port)) throw new Error('Port not allowed');

    const [address] = await resolvePublicAddresses(url.hostname);
    const res = await requestOnce(url, address);

    const location = res.headers.location;
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    return { ...res, finalUrl: url.href };
  }

  throw new Error('Too many redirects');
}