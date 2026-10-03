import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import * as auth from './auth.service.js';

const router = Router();

const baseCookie = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};
const cookieOptions = { ...baseCookie, maxAge: 15 * 60 * 1000 };

const publicUser = (u) => ({ id: u.id, email: u.email, orgId: u.orgId, role: u.role });

router.post('/register', validate(registerSchema), async (req, res) => {
  const user = await auth.register(req.body);
  res.cookie('access_token', auth.signAccessToken(user), cookieOptions);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const user = await auth.login(req.body);
  res.cookie('access_token', auth.signAccessToken(user), cookieOptions);
  res.json({ user: publicUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie('access_token', baseCookie);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;