import mongoose from 'mongoose';

// Shared "Design QR Code" shape used both as a Collection's default design
// (cascades to every QR inside it) and as a QR code's own custom override.
export const designSchema = new mongoose.Schema(
  {
    dotsType: { type: String, default: 'square' },
    cornersSquareType: { type: String, default: 'square' },
    cornersDotType: { type: String, default: 'square' },
    dotsColor: { type: String, default: '#17202A' },
    backgroundColor: { type: String, default: '#FFFFFF' },
    logoSize: { type: Number, default: 0.22 },
    hideBackgroundDots: { type: Boolean, default: true },
    frameStyle: { type: String, default: 'none' },
    frameText: { type: String, default: 'SCAN ME!' },
    frameColor: { type: String, default: '#0F8A5F' },
    frameTextColor: { type: String, default: '#FFFFFF' },
    logo: {
      originalName: String,
      storedName: String,
      mimeType: String,
      sizeBytes: Number,
      path: String
    }
  },
  { _id: false }
);

export const DESIGN_FIELDS = [
  'dotsType', 'cornersSquareType', 'cornersDotType', 'dotsColor', 'backgroundColor',
  'logoSize', 'hideBackgroundDots', 'frameStyle', 'frameText', 'frameColor', 'frameTextColor'
];

export function pickDesignFields(body = {}) {
  const out = {};
  for (const key of DESIGN_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === 'logoSize') {
      const num = Number(body[key]);
      out[key] = Number.isFinite(num) ? Math.min(Math.max(num, 0.1), 0.35) : 0.22;
    } else if (key === 'hideBackgroundDots') {
      out[key] = body[key] === true || body[key] === 'true';
    } else {
      out[key] = String(body[key]).slice(0, 120);
    }
  }
  return out;
}
