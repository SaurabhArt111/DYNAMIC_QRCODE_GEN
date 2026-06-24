import mongoose from 'mongoose';

const qrCodeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    token: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ['active', 'inactive', 'deleted'], default: 'active', index: true },
    sizeBytes: { type: Number, default: 0 },
    deletedAt: Date,
    deletedByCollection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null, index: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null }
  },
  { timestamps: true, collection: 'qrcodes', suppressReservedKeysWarning: true }
);

qrCodeSchema.index({ name: 'text', token: 'text' });
qrCodeSchema.index({ updatedAt: -1 });

export const QRCode = mongoose.model('QRCode', qrCodeSchema);
