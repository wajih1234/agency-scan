import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { createSiteSchema } from './sites.schemas.js';
import * as sites from './sites.service.js';

const router = Router();
router.use(requireAuth);

router.post('/', validate(createSiteSchema), async (req, res) => {
  const site = await sites.addSite(req.user.orgId, req.body);
  res.status(201).json({ site });
});

router.get('/', async (req, res) => {
  res.json({ sites: await sites.listSites(req.user.orgId) });
});

router.delete('/:id', async (req, res) => {
  await sites.deleteSite(req.user.orgId, req.params.id);
  res.status(204).end();
});

export default router;
