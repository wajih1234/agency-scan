import rateLimit from 'express-rate-limit';

const make = (limit, windowMs, extra = {}) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (req, res) =>
      res.status(429).json({ error: 'Too many attempts, please try again later' }),
    ...extra,
  });

export const loginLimiter = make(10, 15 * 60 * 1000, { skipSuccessfulRequests: true });
export const registerLimiter = make(5, 60 * 60 * 1000);