import express from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth } from '../middleware/auth.js';
import { Admin } from '../models/Admin.js';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { RecycleBin } from '../models/RecycleBin.js';
import { Collection } from '../models/Collection.js';
import { logActivity } from '../utils/activity.js';
import { removeUploadFile } from '../utils/storage.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

async function verifyPin(adminId, pin) {
  const admin = await Admin.findById(adminId);
  return bcrypt.compare(String(pin || ''), admin.recyclePinHash);
}

async function recalculateSize(qrId) {
  const result = await Upload.aggregate([
    { $match: { qrCode: qrId, status: { $ne: 'deleted' } } },
    { $group: { _id: '$qrCode', bytes: { $sum: '$sizeBytes' } } }
  ]);
  await QRCode.findByIdAndUpdate(qrId, { sizeBytes: result[0]?.bytes || 0 });
}

router.get('/', requireAuth, async (req, res) => {
  const items = await RecycleBin.find().sort({ deletedAt: -1 }).populate('qrCode').populate('collection').populate('upload').lean();
  res.json({ items });
});

router.post('/:id/restore', requireAuth, async (req, res) => {
  if (!(await verifyPin(req.admin._id, req.body.pin))) {
    return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  }
  const entry = await RecycleBin.findById(req.params.id).populate('qrCode').populate('collection').populate('upload');
  if (!entry) return res.status(404).json({ message: 'Recycle item not found.' });

  if (entry.itemType === 'upload') {
    if (!entry.upload) return res.status(404).json({ message: 'Recycle item not found.' });
    const activeUploads = await Upload.countDocuments({ qrCode: entry.upload.qrCode, status: { $ne: 'deleted' } });
    if (activeUploads >= 4) {
      return res.status(400).json({ message: 'This QR already has the maximum 4 active files.' });
    }
    entry.upload.status = 'active';
    entry.upload.deletedAt = null;
    await entry.upload.save();
    await recalculateSize(entry.upload.qrCode);
    await RecycleBin.deleteOne({ _id: entry._id });
    await logActivity('FILE_RESTORED', entry.upload.qrCode, `File restored: ${entry.upload.originalName}`);
    return res.json({ message: 'File restored.' });
  }

  if (entry.itemType === 'collection') {
    if (!entry.collection) return res.status(404).json({ message: 'Recycle item not found.' });
    entry.collection.status = 'active';
    entry.collection.deletedAt = null;
    await entry.collection.save();
    await RecycleBin.deleteOne({ _id: entry._id });
    await logActivity('COLLECTION_RESTORED', entry.collection._id, `Collection restored: ${entry.collection.name}`);
    return res.json({ message: 'Collection restored.' });
  }

  if (!entry.qrCode) return res.status(404).json({ message: 'Recycle item not found.' });

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
  const entry = await RecycleBin.findById(req.params.id).populate('qrCode').populate('collection').populate('upload');
  if (!entry) return res.status(404).json({ message: 'Recycle item not found.' });

  if (entry.itemType === 'upload') {
    if (!entry.upload) return res.status(404).json({ message: 'Recycle item not found.' });
    await removeUploadFile(entry.upload.path);
    const qrId = entry.upload.qrCode;
    await Upload.deleteOne({ _id: entry.upload._id });
    await RecycleBin.deleteOne({ _id: entry._id });
    await recalculateSize(qrId);
    await logActivity('FILE_PURGED', qrId, `File permanently deleted: ${entry.upload.originalName}`);
    return res.json({ message: 'File permanently deleted.' });
  }

  if (entry.itemType === 'collection') {
    if (!entry.collection) return res.status(404).json({ message: 'Recycle item not found.' });
    await QRCode.updateMany({ collection: entry.collection._id }, { $set: { collection: null } });
    if (entry.collection.defaultPdf?.path) {
      await removeUploadFile(entry.collection.defaultPdf.path).catch(() => {});
    }
    await Collection.deleteOne({ _id: entry.collection._id });
    await RecycleBin.deleteOne({ _id: entry._id });
    await logActivity('COLLECTION_PURGED', entry.collection._id, `Collection permanently deleted: ${entry.collection.name}`);
    return res.json({ message: 'Collection permanently deleted.' });
  }

  if (!entry.qrCode) return res.status(404).json({ message: 'Recycle item not found.' });

  const uploads = await Upload.find({ qrCode: entry.qrCode._id });
  await Promise.all(uploads.map((upload) => removeUploadFile(upload.path)));
  await RecycleBin.deleteMany({ itemType: 'upload', upload: { $in: uploads.map((upload) => upload._id) } });
  await Upload.deleteMany({ qrCode: entry.qrCode._id });
  await QRCode.deleteOne({ _id: entry.qrCode._id });
  await RecycleBin.deleteOne({ _id: entry._id });
  await logActivity('QR_PURGED', entry.qrCode._id, `QR permanently deleted: ${entry.qrCode.name}`);
  res.json({ message: 'QR permanently deleted.' });
});

export default router;
