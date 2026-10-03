import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    logo: String,
    brandColor: { type: String, default: '#1d4ed8' },
    plan: { type: String, enum: ['free', 'starter', 'pro', 'agency'], default: 'free' },
    siteLimit: { type: Number, default: 3 },
  },
  { timestamps: true },
);

export const Organization = mongoose.model('Organization', schema);