import { Router } from 'express';
import { AppError } from '../../middleware/errors.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/requireAuth.js';
import { loginLimiter, registerLimiter } from '../../middleware/rateLimit.js';
import { registerSchema, loginSchema } from './auth.schemas.js';
import * as auth from './auth.service.js';

const router = Router();

const base = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
};
const accessCookie = { ...base, path: '/', maxAge: 15 * 60 * 1000 };
const refreshCookie = { ...base, path: '/api/auth', maxAge: auth.REFRESH_TTL_MS };

const publicUser = (u) => ({ id: u.id, email: u.email, orgId: u.orgId, role: u.role });

async function startSession(res, user) {
  const refresh = await auth.issueRefreshToken(user.id);
  res.cookie('access_token', auth.signAccessToken(user), accessCookie);
  res.cookie('refresh_token', refresh, refreshCookie);
}

router.post('/register', registerLimiter, validate(registerSchema), async (req, res) => {
  const user = await auth.register(req.body);
  await startSession(res, user);
  res.status(201).json({ user: publicUser(user) });
});

router.post('/login', loginLimiter, validate(loginSchema), async (req, res) => {
  const user = await auth.login(req.body);
  await startSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies.refresh_token;
  if (typeof token !== 'string' || !token) throw new AppError(401, 'No refresh token');
  const user = await auth.rotateRefreshToken(token);
  await startSession(res, user);
  res.json({ user: publicUser(user) });
});

router.post('/logout', async (req, res) => {
  const token = req.cookies.refresh_token;
  if (typeof token === 'string' && token) await auth.revokeRefreshToken(token);
  res.clearCookie('access_token', { ...base, path: '/' });
  res.clearCookie('refresh_token', { ...base, path: '/api/auth' });
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;