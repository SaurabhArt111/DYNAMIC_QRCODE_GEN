import mongoose from 'mongoose';

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    defaultPdf: {
      originalName: String,
      storedName: String,
      mimeType: String,
      sizeBytes: Number,
      path: String
    }
  },
  { timestamps: true, collection: 'collections' }
);

export const Collection = mongoose.model('Collection', collectionSchema);
