import { Router } from 'express';
import { AppError } from '../../middleware/errors.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { Organization } from '../orgs/organization.model.js';
import { getScan } from '../scans/scans.service.js';
import { buildReportPdf } from './report.js';

const router = Router();

router.get('/scans/:id/report.pdf', requireAuth, async (req, res) => {
  const scan = await getScan(req.user.orgId, req.params.id);

  if (scan.status === 'running') throw new AppError(409, 'The scan is still running, try again in a few seconds');
  if (scan.status === 'failed') throw new AppError(409, 'This scan failed, run a new scan');

  const org = await Organization.findById(req.user.orgId);
  if (!org) throw new AppError(404, 'Organization not found');

  const pdf = await buildReportPdf({ org: org.toObject(), scan: scan.toObject() });
  const safeName = scan.domain.replace(/[^a-z0-9.-]/gi, '_');

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="security-report-${safeName}.pdf"`,
    'Cache-Control': 'private, no-store',
  });
  res.send(pdf);
});

export default router;
