import { computeScore, runScan } from './runScan.js';

const f = (severity, passed) => ({ severity, passed });

const cases = [
  ['no findings', [], 100],
  ['passed findings cost nothing', [f('critical', true), f('high', true)], 100],
  ['one critical failed', [f('critical', false)], 70],
  ['mixed failures', [f('high', false), f('medium', false), f('low', false), f('low', true)], 80],
  ['never below zero', [f('critical', false), f('critical', false), f('critical', false), f('critical', false)], 0],
];

console.log('Scoring logic:');
for (const [name, findings, expected] of cases) {
  const got = computeScore(findings);
  console.log(`  ${got === expected ? 'OK   ' : 'WRONG'} ${name} → ${got}`);
}

for (const domain of ['github.com', 'example.com', 'expired.badssl.com', 'localhost']) {
  console.log(`\nScanning ${domain} ...`);
  const r = await runScan(domain);
  const failed = r.findings.filter((x) => !x.passed);
  const seconds = ((r.finishedAt - r.startedAt) / 1000).toFixed(1);
  console.log(`  status=${r.status}  score=${r.score}  complete=${r.complete}  findings=${r.findings.length}  failed=${failed.length}  (${seconds}s)`);
  for (const x of failed) console.log(`    FAIL [${x.severity}] ${x.title}`);
}