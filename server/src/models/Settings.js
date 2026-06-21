import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, collection: 'settings' }
);

export const Settings = mongoose.model('Settings', settingsSchema);
