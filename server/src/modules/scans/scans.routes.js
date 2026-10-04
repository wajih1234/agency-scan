import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import * as scans from './scans.service.js';

const router = Router();

router.post('/sites/:id/scans', requireAuth, async (req, res) => {
  const scan = await scans.startScan(req.user.orgId, req.params.id);
  res.status(202).json({ scan });
});

router.get('/sites/:id/scans', requireAuth, async (req, res) => {
  res.json({ scans: await scans.listScans(req.user.orgId, req.params.id) });
});

router.get('/scans/:id', requireAuth, async (req, res) => {
  res.json({ scan: await scans.getScan(req.user.orgId, req.params.id) });
});

export default router;