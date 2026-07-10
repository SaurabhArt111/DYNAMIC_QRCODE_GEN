import mongoose from 'mongoose';
import { designSchema } from './designSchema.js';

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    status: { type: String, enum: ['active', 'deleted'], default: 'active', index: true },
    deletedAt: Date,
    defaultPdf: {
      originalName: String,
      storedName: String,
      mimeType: String,
      sizeBytes: Number,
      path: String
    },
    // "Design QR Code" default look, applied to every QR in this collection
    // that hasn't opted into its own custom design. Bulk ZIP/PDF exports for
    // the collection always render with this design so the whole batch stays
    // visually consistent.
    design: { type: designSchema, default: () => ({}) }
  },
  { timestamps: true, collection: 'collections' }
);

export const Collection = mongoose.model('Collection', collectionSchema);
