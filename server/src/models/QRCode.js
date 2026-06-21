import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    token: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active', index: true },
    sizeBytes: { type: Number, default: 0 },
    scanCount: { type: Number, default: 0 },
    lastScannedAt: Date,
    deletedAt: Date
  },
  { timestamps: true, collection: 'qrcodes' }
);

qrCodeSchema.index({ name: 'text', token: 'text' });
qrCodeSchema.index({ updatedAt: -1 });
qrCodeSchema.index({ scanCount: -1 });

export const QRCode = mongoose.model('QRCode', qrCodeSchema);
