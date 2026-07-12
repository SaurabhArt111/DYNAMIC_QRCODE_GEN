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
    // 'custom' uses frameText verbatim; 'qrName' substitutes each QR's own
    // name at render time (most useful for collection-wide bulk exports,
    // where every QR should be captioned with its own title).
    frameTextMode: { type: String, enum: ['custom', 'qrName'], default: 'custom' },
    frameText: { type: String, default: 'SCAN ME!' },
    frameColor: { type: String, default: '#0F8A5F' },
    frameTextColor: { type: String, default: '#FFFFFF' },
    // How large the QR appears inside an uploaded custom frame image, and a
    // vertical nudge (as a fraction of the frame's height) for frames whose
    // cutout isn't perfectly centered. Optionally shows the same caption
    // (custom text or each QR's name) as a pill over the custom frame image.
    frameImageScale: { type: Number, default: 0.55 },
    frameImageOffsetY: { type: Number, default: 0 },
    frameImageCaptionSize: { type: Number, default: 0.13 },
    frameImageCaptionOffsetY: { type: Number, default: 0.06 },
    frameImageShowCaption: { type: Boolean, default: false },
    logo: {
      originalName: String,
      storedName: String,
      mimeType: String,
      sizeBytes: Number,
      path: String
    },
    frameImage: {
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
  'logoSize', 'hideBackgroundDots', 'frameStyle', 'frameTextMode', 'frameText', 'frameColor', 'frameTextColor',
  'frameImageScale', 'frameImageOffsetY', 'frameImageCaptionSize', 'frameImageCaptionOffsetY', 'frameImageShowCaption'
];

export function pickDesignFields(body = {}) {
  const out = {};
  for (const key of DESIGN_FIELDS) {
    if (body[key] === undefined) continue;
    if (key === 'logoSize') {
      const num = Number(body[key]);
      out[key] = Number.isFinite(num) ? Math.min(Math.max(num, 0.1), 0.35) : 0.22;
    } else if (key === 'frameImageScale') {
      const num = Number(body[key]);
      out[key] = Number.isFinite(num) ? Math.min(Math.max(num, 0.2), 0.9) : 0.55;
    } else if (key === 'frameImageCaptionSize') {
      const num = Number(body[key]);
      out[key] = Number.isFinite(num) ? Math.min(Math.max(num, 0.04), 0.3) : 0.13;
    } else if (key === 'frameImageCaptionOffsetY') {
      const num = Number(body[key]);
      out[key] = Number.isFinite(num) ? Math.min(Math.max(num, -0.35), 0.35) : 0.06;
    } else if (key === 'frameImageOffsetY') {
      const num = Number(body[key]);
      out[key] = Number.isFinite(num) ? Math.min(Math.max(num, -0.35), 0.35) : 0;
    } else if (key === 'hideBackgroundDots' || key === 'frameImageShowCaption') {
      out[key] = body[key] === true || body[key] === 'true';
    } else if (key === 'frameTextMode') {
      out[key] = body[key] === 'qrName' ? 'qrName' : 'custom';
    } else if (key === 'backgroundColor' || key === 'dotsColor') {
      out[key] = body[key] === 'transparent' ? 'transparent' : String(body[key]).slice(0, 120);
    } else {
      out[key] = String(body[key]).slice(0, 120);
    }
  }
  return out;
}
