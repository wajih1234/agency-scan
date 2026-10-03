import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    domain: { type: String, required: true, lowercase: true, trim: true },
    clientName: { type: String, required: true, trim: true, maxlength: 100 },
    verified: { type: Boolean, default: false },
    verificationToken: { type: String, required: true },
    lastScore: Number,
    lastScanAt: Date,
  },
  { timestamps: true },
);

// the same agency can't add the same domain twice
schema.index({ orgId: 1, domain: 1 }, { unique: true });

export const Site = mongoose.model('Site', schema);
