import mongoose from 'mongoose';

const recycleBinSchema = new mongoose.Schema(
  {
    qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', required: true, unique: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    deletedAt: { type: Date, default: Date.now },
    snapshot: { type: Object, required: true }
  },
  { timestamps: true, collection: 'recyclebin' }
);

export const RecycleBin = mongoose.model('RecycleBin', recycleBinSchema);
