import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { AppError } from '../../middleware/errors.js';
import { Organization } from '../orgs/organization.model.js';
import { User } from './user.model.js';

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