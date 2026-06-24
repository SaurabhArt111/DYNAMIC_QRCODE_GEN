import mongoose from 'mongoose';

const recycleBinSchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ['qr', 'collection', 'upload'], default: 'qr', index: true },
    qrCode: { type: mongoose.Schema.Types.ObjectId, ref: 'QRCode', default: null },
    collection: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection', default: null },
    upload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload', default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
    deletedAt: { type: Date, default: Date.now },
    snapshot: { type: Object, required: true }
  },
  { timestamps: true, collection: 'recyclebin', suppressReservedKeysWarning: true }
);

recycleBinSchema.index(
  { qrCode: 1 },
  { unique: true, partialFilterExpression: { qrCode: { $type: 'objectId' } } }
);
recycleBinSchema.index(
  { collection: 1 },
  { unique: true, partialFilterExpression: { collection: { $type: 'objectId' } } }
);
recycleBinSchema.index(
  { upload: 1 },
  { unique: true, partialFilterExpression: { upload: { $type: 'objectId' } } }
);

export const RecycleBin = mongoose.model('RecycleBin', recycleBinSchema);
