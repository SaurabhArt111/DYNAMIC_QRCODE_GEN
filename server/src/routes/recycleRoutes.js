import express from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { Admin } from '../models/Admin.js';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { RecycleBin } from '../models/RecycleBin.js';
import { logActivity } from '../utils/activity.js';
import { removeUploadFile } from '../utils/storage.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

async function verifyPin(adminId, pin) {
  const admin = await Admin.findById(adminId);
  return bcrypt.compare(String(pin || ''), admin.recyclePinHash);
}

router.get('/', requireAuth, async (req, res) => {
  const items = await RecycleBin.find().sort({ deletedAt: -1 }).populate('qrCode').lean();
  res.json({ items });
});

router.post('/:id/restore', requireAuth, async (req, res) => {
  if (!(await verifyPin(req.admin._id, req.body.pin))) {
    return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  }
  const entry = await RecycleBin.findById(req.params.id).populate('qrCode');
  if (!entry || !entry.qrCode) return res.status(404).json({ message: 'Recycle item not found.' });

  entry.qrCode.status = 'active';
  entry.qrCode.deletedAt = null;
  await entry.qrCode.save();
  await RecycleBin.deleteOne({ _id: entry._id });
  await logActivity('QR_RESTORED', entry.qrCode._id, `QR restored: ${entry.qrCode.name}`);
  res.json({ message: 'QR restored.' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (!(await verifyPin(req.admin._id, req.body.pin))) {
    return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  }
  const entry = await RecycleBin.findById(req.params.id).populate('qrCode');
  if (!entry || !entry.qrCode) return res.status(404).json({ message: 'Recycle item not found.' });

  const uploads = await Upload.find({ qrCode: entry.qrCode._id });
  await Promise.all(uploads.map((upload) => removeUploadFile(upload.path)));
  await Upload.deleteMany({ qrCode: entry.qrCode._id });
  await QRCode.deleteOne({ _id: entry.qrCode._id });
  await RecycleBin.deleteOne({ _id: entry._id });
  await logActivity('QR_PURGED', entry.qrCode._id, `QR permanently deleted: ${entry.qrCode.name}`);
  res.json({ message: 'QR permanently deleted.' });
});

export default router;
