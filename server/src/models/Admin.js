import mongoose from 'mongoose';

const adminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    recyclePinHash: { type: String, required: true },
    lastLoginAt: Date,
    passwordChangedAt: Date
  },
  { timestamps: true, collection: 'admins' }
);

export const Admin = mongoose.model('Admin', adminSchema);
