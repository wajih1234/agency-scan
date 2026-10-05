import dns from 'node:dns/promises';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AppError } from '../../middleware/errors.js';
import { Organization } from '../orgs/organization.model.js';
import { Site } from './site.model.js';

export async function addSite(orgId, { domain, clientName }) {
  const org = await Organization.findById(orgId);
  const count = await Site.countDocuments({ orgId });
  if (count >= org.siteLimit) {
    throw new AppError(403, 'Site limit reached for your plan');
  }

  try {
    return await Site.create({
      orgId,
      domain,
      clientName,
      verificationToken: crypto.randomBytes(16).toString('hex'),
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'Site already added');
    throw err;
  }
}

export const listSites = (orgId) => Site.find({ orgId }).sort({ createdAt: -1 });

export async function deleteSite(orgId, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Site not found');
  const result = await Site.deleteOne({ _id: id, orgId });
  if (!result.deletedCount) throw new AppError(404, 'Site not found');
}

export async function verifySite(orgId, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Site not found');
  const site = await Site.findOne({ _id: id, orgId });
  if (!site) throw new AppError(404, 'Site not found');
  if (site.verified) return site;

  const host = `_agencyscan.${site.domain}`;
  const expected = `agencyscan-verify=${site.verificationToken}`;

  let records = [];
  try {
    records = await dns.resolveTxt(host);
  } catch {
    // no record yet, handled below
  }

  const found = records.some((chunks) => chunks.join('') === expected);
  if (!found) {
    throw new AppError(422, `TXT record not found. Add a TXT record named ${host} with the value ${expected}`);
  }

  site.verified = true;
  await site.save();
  return site;
}
