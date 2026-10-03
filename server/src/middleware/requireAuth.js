import jwt from 'jsonwebtoken';
import { AppError } from './errors.js';

export function requireAuth(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) throw new AppError(401, 'Not authenticated');
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    });
    req.user = { id: payload.sub, orgId: payload.orgId };
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}