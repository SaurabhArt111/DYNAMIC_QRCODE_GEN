import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema(
  {
    qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', required: true, index: true },
    event: { type: String, enum: ['scan', 'download', 'view'], required: true },
    ip: String,
    userAgent: String,
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' }
  },
  { timestamps: true, collection: 'analytics' }
);

analyticsSchema.index({ createdAt: -1 });

export const Analytics = mongoose.model('Analytics', analyticsSchema);
