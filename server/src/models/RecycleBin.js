import mongoose from 'mongoose';

const recycleBinSchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ['qr', 'collection', 'upload'], default: 'qr', index: true },
    qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', unique: true, sparse: true },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', unique: true, sparse: true },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', unique: true, sparse: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    deletedAt: { type: Date, default: Date.now },
    snapshot: { type: Object, required: true }
  },
  { timestamps: true, collection: 'recyclebin', suppressReservedKeysWarning: true }
);

export const RecycleBin = mongoose.model('RecycleBin', recycleBinSchema);
