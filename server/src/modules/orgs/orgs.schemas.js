import { z } from 'zod';

export const updateOrgSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex color like #0f766e').optional(),
    logo: z
      .string()
      .max(70_000, 'Logo is too large (about 50 KB maximum)')
      .regex(/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/, 'Logo must be a PNG or JPEG')
      .nullable()
      .optional(),
  })
  .refine((o) => Object.keys(o).length > 0, { message: 'Nothing to update' });
