import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      enum: ['QR_CREATED', 'QR_MODIFIED', 'QR_DELETED', 'QR_RESTORED', 'QR_PURGED', 'FILES_UPDATED'],
      required: true
    },
    qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode' },
    message: { type: String, required: true },
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, collection: 'activitylogs' }
);

activityLogSchema.index({ createdAt: -1 });

export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
