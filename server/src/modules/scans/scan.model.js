import mongoose from 'mongoose';

const findingSchema = new mongoose.Schema(
  {
    checkId: String,
    severity: String,
    passed: Boolean,
    title: String,
    description: String,
    fix: String,
  },
  { _id: false },
);

const schema = new mongoose.Schema(
  {
    siteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    domain: { type: String, required: true },
    status: { type: String, enum: ['running', 'done', 'unreachable', 'failed'], default: 'running' },
    score: { type: Number, default: null },
    complete: Boolean,
    findings: [findingSchema],
    startedAt: Date,
    finishedAt: Date,
  },
  { timestamps: true },
);

schema.index({ siteId: 1, createdAt: -1 });

// the database itself refuses a second running scan for the same site
schema.index({ siteId: 1 }, { unique: true, partialFilterExpression: { status: 'running' } });

export const Scan = mongoose.model('Scan', schema);