import { z } from 'zod';

const domain = z
  .string()
  .trim()
  .toLowerCase()
  .transform((v) => v.replace(/^https?:\/\//, '').split('/')[0].split(':')[0])
  .pipe(
    z
      .string()
      .max(253)
      .regex(/^(?!-)([a-z0-9-]{1,63}(?<!-)\.)+[a-z]{2,63}$/, 'Invalid domain'),
  );

export const createSiteSchema = z.object({
  domain,
  clientName: z.string().trim().min(1).max(100),
});