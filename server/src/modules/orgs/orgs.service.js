import { AppError } from '../../middleware/errors.js';
import { Organization } from './organization.model.js';

const publicOrg = (o) => ({
  id: o.id,
  name: o.name,
  logo: o.logo ?? null,
  brandColor: o.brandColor,
  plan: o.plan,
  siteLimit: o.siteLimit,
});

export async function getOrg(orgId) {
  const org = await Organization.findById(orgId);
  if (!org) throw new AppError(404, 'Organization not found');
  return publicOrg(org);
}

export async function updateOrg(orgId, patch) {
  const org = await Organization.findByIdAndUpdate(
    orgId,
    { $set: patch },
    { new: true, runValidators: true },
  );
  if (!org) throw new AppError(404, 'Organization not found');
  return publicOrg(org);
}