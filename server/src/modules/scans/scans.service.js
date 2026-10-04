import mongoose from 'mongoose';
import { AppError } from '../../middleware/errors.js';
import { Site } from '../sites/site.model.js';
import { runScan } from '../../scanner/runScan.js';
import { Scan } from './scan.model.js';

async function executeScan(scanId, site) {
  try {
    const r = await runScan(site.domain);
    await Scan.updateOne(
      { _id: scanId },
      { status: r.status, score: r.score, complete: r.complete, findings: r.findings, finishedAt: r.finishedAt },
    );
    await Site.updateOne({ _id: site._id }, { lastScore: r.score, lastScanAt: r.finishedAt });
  } catch (err) {
    await Scan.updateOne({ _id: scanId }, { status: 'failed', finishedAt: new Date() });
    throw err;
  }
}

export async function startScan(orgId, siteId) {
  if (!mongoose.isValidObjectId(siteId)) throw new AppError(404, 'Site not found');
  const site = await Site.findOne({ _id: siteId, orgId });
  if (!site) throw new AppError(404, 'Site not found');
  if (!site.verified) throw new AppError(403, 'Verify domain ownership before scanning');

  let scan;
  try {
    scan = await Scan.create({
      siteId: site._id,
      orgId,
      domain: site.domain,
      status: 'running',
      startedAt: new Date(),
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError(409, 'A scan is already running for this site');
    throw err;
  }

  executeScan(scan._id, site).catch((err) => console.error('Scan crashed:', err));
  return scan;
}

export async function listScans(orgId, siteId) {
  if (!mongoose.isValidObjectId(siteId)) throw new AppError(404, 'Site not found');
  if (!(await Site.exists({ _id: siteId, orgId }))) throw new AppError(404, 'Site not found');
  return Scan.find({ siteId, orgId }).select('-findings').sort({ createdAt: -1 }).limit(50);
}

export async function getScan(orgId, id) {
  if (!mongoose.isValidObjectId(id)) throw new AppError(404, 'Scan not found');
  const scan = await Scan.findOne({ _id: id, orgId });
  if (!scan) throw new AppError(404, 'Scan not found');
  return scan;
}

export async function failStaleScans() {
  await Scan.updateMany({ status: 'running' }, { status: 'failed', finishedAt: new Date() });
}