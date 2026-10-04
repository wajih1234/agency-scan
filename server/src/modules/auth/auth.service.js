import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { AppError } from '../../middleware/errors.js';
import { Organization } from '../orgs/organization.model.js';
import { User } from './user.model.js';
import { RefreshToken } from './refreshToken.model.js';

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

export async function register({ orgName, email, password }) {
  if (await User.exists({ email })) {
    throw new AppError(409, 'Email already registered');
  }

  const org = await Organization.create({ name: orgName });

  try {
    const passwordHash = await argon2.hash(password);
    return await User.create({
      email,
      passwordHash,
      orgId: org._id,
      role: 'owner',
    });
  } catch (err) {
    await Organization.deleteOne({ _id: org._id });
    if (err.code === 11000) throw new AppError(409, 'Email already registered');
    throw err;
  }
}

export async function login({ email, password }) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = user && (await argon2.verify(user.passwordHash, password));
  if (!ok) throw new AppError(401, 'Invalid email or password');
  return user;
}

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, orgId: user.orgId.toString() },
    process.env.JWT_ACCESS_SECRET,
    { algorithm: 'HS256', expiresIn: '15m' },
  );
}

export async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  await RefreshToken.create({
    userId,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });
  return token;
}

export async function rotateRefreshToken(token) {
  // deleting the token and reading it is one atomic step, so a token can only be used once
  const doc = await RefreshToken.findOneAndDelete({ tokenHash: sha256(token) });
  if (!doc || doc.expiresAt < new Date()) throw new AppError(401, 'Invalid refresh token');
  const user = await User.findById(doc.userId);
  if (!user) throw new AppError(401, 'Invalid refresh token');
  return user;
}

export const revokeRefreshToken = (token) => RefreshToken.deleteOne({ tokenHash: sha256(token) });