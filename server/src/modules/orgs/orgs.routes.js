import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { updateOrgSchema } from './orgs.schemas.js';
import * as orgs from './orgs.service.js';

const router = Router();
router.use(requireAuth);

router.get('/', async (req, res) => {
  res.json({ org: await orgs.getOrg(req.user.orgId) });
});

router.patch('/', validate(updateOrgSchema), async (req, res) => {
  res.json({ org: await orgs.updateOrg(req.user.orgId, req.body) });
});

export default router;