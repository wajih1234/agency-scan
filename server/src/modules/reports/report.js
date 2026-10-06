import path from 'node:path';
import { createRequire } from 'node:module';
import pdfmake from 'pdfmake';

const require = createRequire(import.meta.url);
const fontDir = path.join(path.dirname(require.resolve('pdfmake/package.json')), 'fonts', 'Roboto');

// The PDF library may never download anything or read files, except its own fonts.
pdfmake.setUrlAccessPolicy(() => false);
pdfmake.setLocalAccessPolicy((p) => p.startsWith(fontDir));
pdfmake.addFonts({
  Roboto: {
    normal: path.join(fontDir, 'Roboto-Regular.ttf'),
    bold: path.join(fontDir, 'Roboto-Medium.ttf'),
    italics: path.join(fontDir, 'Roboto-Italic.ttf'),
    bolditalics: path.join(fontDir, 'Roboto-MediumItalic.ttf'),
  },
});

const SEVERITY = {
  critical: { label: 'CRITICAL', color: '#b91c1c', order: 0 },
  high: { label: 'HIGH', color: '#c2410c', order: 1 },
  medium: { label: 'MEDIUM', color: '#a16207', order: 2 },
  low: { label: 'LOW', color: '#475569', order: 3 },
};

const scoreColor = (s) => (s >= 80 ? '#15803d' : s >= 60 ? '#a16207' : '#b91c1c');

function readableOn(hex) {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#111827' : '#ffffff';
}

function summaryText(failed) {
  if (failed.length === 0) return 'No issues found.';
  const parts = Object.keys(SEVERITY)
    .map((key) => [key, failed.filter((f) => f.severity === key).length])
    .filter(([, count]) => count > 0)
    .map(([key, count]) => `${count} ${key}`);
  return `${failed.length} issue${failed.length > 1 ? 's' : ''} found: ${parts.join(', ')}.`;
}

function buildDefinition({ org, scan }, withLogo) {
  const brand = /^#[0-9a-fA-F]{6}$/.test(org.brandColor ?? '') ? org.brandColor : '#1d4ed8';
  const fg = readableOn(brand);
  const hasLogo = withLogo && Boolean(org.logo);

  const findings = scan.findings ?? [];
  const failed = findings
    .filter((f) => !f.passed)
    .sort((a, b) => (SEVERITY[a.severity]?.order ?? 9) - (SEVERITY[b.severity]?.order ?? 9));
  const passed = findings.filter((f) => f.passed);

  const when = new Date(scan.finishedAt ?? scan.startedAt ?? Date.now()).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const hasScore = typeof scan.score === 'number';

  const content = [
    {
      table: {
        widths: ['*'],
        body: [
          [
            {
              fillColor: brand,
              margin: [16, 14, 16, 14],
              columns: [
                ...(hasLogo ? [{ image: org.logo, fit: [110, 44], width: 110 }] : []),
                {
                  text: org.name,
                  fontSize: 20,
                  bold: true,
                  color: fg,
                  margin: [hasLogo ? 14 : 0, hasLogo ? 10 : 6, 0, 0],
                },
              ],
            },
          ],
        ],
      },
      layout: 'noBorders',
    },
    { text: 'Website security report', fontSize: 22, bold: true, margin: [0, 22, 0, 4] },
    { text: scan.domain, fontSize: 14, bold: true, color: '#374151' },
    { text: `Scan date: ${when}`, fontSize: 10, color: '#6b7280', margin: [0, 4, 0, 18] },
    {
      columns: [
        {
          width: 130,
          stack: [
            { text: 'SECURITY SCORE', fontSize: 8, bold: true, color: '#6b7280' },
            hasScore
              ? {
                  text: [
                    { text: String(scan.score), fontSize: 44, bold: true, color: scoreColor(scan.score) },
                    { text: ' / 100', fontSize: 14, color: '#6b7280' },
                  ],
                }
              : { text: 'Not available', fontSize: 18, bold: true, color: '#6b7280', margin: [0, 10, 0, 0] },
          ],
        },
        {
          width: '*',
          margin: [0, 14, 0, 0],
          stack: [
            {
              text: hasScore
                ? summaryText(failed)
                : 'We could not open a secure connection to this site, so no score was calculated.',
              fontSize: 12,
            },
            {
              text: `${findings.length} checks performed, ${passed.length} passed.`,
              fontSize: 10,
              color: '#6b7280',
              margin: [0, 4, 0, 0],
            },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    },
  ];

  if (scan.complete === false) {
    content.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              text: 'Some checks could not be completed. The score may not reflect every area of the site. Run the scan again to confirm.',
              fontSize: 10,
              color: '#92400e',
              fillColor: '#fef3c7',
              margin: [10, 8, 10, 8],
            },
          ],
        ],
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 10],
    });
  }

  if (failed.length > 0) {
    content.push({ text: 'Issues to fix', fontSize: 15, bold: true, margin: [0, 14, 0, 8] });
    for (const f of failed) {
      const sev = SEVERITY[f.severity] ?? { label: String(f.severity).toUpperCase(), color: '#475569' };
      content.push({
        unbreakable: true,
        margin: [0, 0, 0, 12],
        stack: [
          {
            columns: [
              { text: sev.label, color: sev.color, bold: true, fontSize: 8, width: 58, margin: [0, 3, 0, 0] },
              { text: f.title, bold: true, fontSize: 11 },
            ],
          },
          { text: f.description, fontSize: 10, color: '#374151', margin: [58, 3, 0, 0] },
          { text: [{ text: 'How to fix: ', bold: true }, f.fix], fontSize: 10, margin: [58, 3, 0, 0] },
        ],
      });
    }
  }

  if (passed.length > 0) {
    content.push({ text: 'Checks passed', fontSize: 15, bold: true, margin: [0, 14, 0, 8] });
    content.push({ ul: passed.map((f) => f.title), fontSize: 10, color: '#374151' });
  }

  content.push({
    text: 'This report is based on automated, non-intrusive checks of publicly visible information. It does not replace a full security audit.',
    fontSize: 8,
    italics: true,
    color: '#6b7280',
    margin: [0, 24, 0, 0],
  });

  return {
    info: { title: `Security report - ${scan.domain}`, author: org.name },
    pageSize: 'A4',
    pageMargins: [40, 40, 40, 50],
    defaultStyle: { font: 'Roboto', fontSize: 10 },
    content,
    footer: (current, total) => ({
      margin: [40, 0, 40, 0],
      columns: [
        { text: `${org.name} - Website security report`, fontSize: 8, color: '#6b7280' },
        { text: `Page ${current} of ${total}`, alignment: 'right', fontSize: 8, color: '#6b7280' },
      ],
    }),
  };
}

export async function buildReportPdf(data) {
  try {
    return await pdfmake.createPdf(buildDefinition(data, true)).getBuffer();
  } catch (err) {
    if (!data.org.logo) throw err;
    // a broken logo must never block the report
    return pdfmake.createPdf(buildDefinition(data, false)).getBuffer();
  }
}
