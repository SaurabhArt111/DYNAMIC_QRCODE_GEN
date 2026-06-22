import mongoose from 'mongoose';

const collectionFileSchema = new mongoose.Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    category: { type: String, enum: ['pdf'], default: 'pdf' },
    path: { type: String, required: true }
  },
  { _id: false }
);

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    defaultFile: collectionFileSchema
  },
  { timestamps: true, collection: 'collections' }
);

collectionSchema.index({ name: 'text' });

export const Collection = mongoose.model('Collection', collectionSchema);
