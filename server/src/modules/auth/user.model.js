import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    orgId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    role: { type: String, enum: ['owner', 'member'], default: 'owner' },
  },
  { timestamps: true },
);

export const User = mongoose.model('User', schema);