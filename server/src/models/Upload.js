import mongoose from 'mongoose';

const uploadSchema = new mongoose.Schema(
  {
    qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', required: true, index: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    category: { type: String, enum: ['image', 'video', 'pdf', 'audio', 'document'], required: true },
    path: { type: String, required: true },
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
    deletedAt: Date
  },
  { timestamps: true, collection: 'uploads' }
);

export const Upload = mongoose.model('Upload', uploadSchema);
