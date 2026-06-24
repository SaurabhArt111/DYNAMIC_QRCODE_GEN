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
import {
  purgeCollectionCascade,
  purgeQrCascade,
  recalculateQrSize,
  restoreCollectionCascade,
  restoreQrFromRecycle
} from '../services/qrLifecycle.js';

const router = asyncRouter(express.Router());

async function verifyPin(adminId, pin) {
  const admin = await Admin.findById(adminId);
  return bcrypt.compare(String(pin || ''), admin.recyclePinHash);
}

function itemName(entry) {
  return entry.qrCode?.name || entry.collection?.name || entry.upload?.originalName || entry.snapshot?.name || entry.snapshot?.originalName || '';
}

function sortItems(items, sort) {
  const sorted = [...items];
  if (sort === 'oldest') return sorted.sort((a, b) => new Date(a.deletedAt) - new Date(b.deletedAt));
  if (sort === 'type') return sorted.sort((a, b) => a.itemType.localeCompare(b.itemType) || itemName(a).localeCompare(itemName(b)));
  if (sort === 'name') return sorted.sort((a, b) => itemName(a).localeCompare(itemName(b)) || new Date(b.deletedAt) - new Date(a.deletedAt));
  return sorted.sort((a, b) => new Date(b.deletedAt) - new Date(a.deletedAt));
}

function applyFilters(items, query) {
  const search = String(query.search || '').trim().toLowerCase();
  const itemType = String(query.type || 'all');
  const filtered = items.filter((item) => {
    if (itemType !== 'all' && item.itemType !== itemType) return false;
    if (!search) return true;
    const haystack = [
      itemName(item),
      item.snapshot?.description,
      item.snapshot?.token,
      item.itemType
    ].filter(Boolean).join(' ').toLowerCase();
    return haystack.includes(search);
  });
  return sortItems(filtered, String(query.sort || 'newest'));
}

async function verifyOrReject(adminId, pin) {
  const ok = await verifyPin(adminId, pin);
  return ok;
}

async function restoreEntry(entry) {
  if (entry.itemType === 'upload') {
    if (!entry.upload) return { status: 404, message: 'Recycle item not found.' };
    const activeUploads = await Upload.countDocuments({ qrCode: entry.upload.qrCode, status: { $ne: 'deleted' } });
    if (activeUploads >= 4) {
      return { status: 400, message: 'This QR already has the maximum 4 active files.' };
    }
    entry.upload.status = 'active';
    entry.upload.deletedAt = null;
    await entry.upload.save();
    await recalculateQrSize(entry.upload.qrCode);
    await RecycleBin.deleteOne({ _id: entry._id });
    await logActivity('FILE_RESTORED', entry.upload.qrCode, `File restored: ${entry.upload.originalName}`);
    return { status: 200, message: 'File restored.' };
  }

  if (entry.itemType === 'collection') {
    const ok = await restoreCollectionCascade(entry);
    if (!ok) return { status: 404, message: 'Recycle item not found.' };
    return { status: 200, message: 'Collection restored.' };
  }

  const ok = await restoreQrFromRecycle(entry);
  if (!ok) return { status: 404, message: 'Recycle item not found.' };
  return { status: 200, message: 'QR restored.' };
}

async function purgeEntry(entry) {
  if (entry.itemType === 'upload') {
    if (!entry.upload) return { status: 404, message: 'Recycle item not found.' };
    await removeUploadFile(entry.upload.path).catch(() => {});
    const qrId = entry.upload.qrCode;
    await Upload.deleteOne({ _id: entry.upload._id });
    await RecycleBin.deleteOne({ _id: entry._id });
    await recalculateQrSize(qrId);
    await logActivity('FILE_PURGED', qrId, `File permanently deleted: ${entry.upload.originalName}`);
    return { status: 200, message: 'File permanently deleted.' };
  }

  if (entry.itemType === 'collection') {
    const ok = await purgeCollectionCascade(entry);
    if (!ok) return { status: 404, message: 'Recycle item not found.' };
    return { status: 200, message: 'Collection permanently deleted.' };
  }

  if (!entry.qrCode) return { status: 404, message: 'Recycle item not found.' };
  await purgeQrCascade(entry.qrCode._id);
  await RecycleBin.deleteOne({ _id: entry._id });
  await logActivity('QR_PURGED', entry.qrCode._id, `QR permanently deleted: ${entry.qrCode.name}`);
  return { status: 200, message: 'QR permanently deleted.' };
}

router.get('/', requireAuth, async (req, res) => {
  const items = await RecycleBin.find().sort({ deletedAt: -1 }).populate('qrCode').populate('collection').populate('upload').lean();
  const filteredItems = applyFilters(items, req.query);
  res.json({ items: filteredItems, total: filteredItems.length });
});

router.post('/:id/restore', requireAuth, async (req, res) => {
  if (!(await verifyOrReject(req.admin._id, req.body.pin))) {
    return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  }
  const entry = await RecycleBin.findById(req.params.id).populate('qrCode').populate('collection').populate('upload');
  if (!entry) return res.status(404).json({ message: 'Recycle item not found.' });
  const result = await restoreEntry(entry);
  return res.status(result.status).json({ message: result.message });
});

router.post('/restore-many', requireAuth, async (req, res) => {
  if (!(await verifyOrReject(req.admin._id, req.body.pin))) {
    return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  }
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const entries = await RecycleBin.find({ _id: { $in: ids } }).populate('qrCode').populate('collection').populate('upload');
  const results = [];
  for (const entry of entries) {
    results.push({ id: String(entry._id), ...(await restoreEntry(entry)) });
  }
  res.json({
    restored: results.filter((item) => item.status === 200).length,
    results
  });
});

router.delete('/purge-many', requireAuth, async (req, res) => {
  if (!(await verifyOrReject(req.admin._id, req.body.pin))) {
    return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  }
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  const entries = await RecycleBin.find({ _id: { $in: ids } }).populate('qrCode').populate('collection').populate('upload');
  const results = [];
  for (const entry of entries) {
    results.push({ id: String(entry._id), ...(await purgeEntry(entry)) });
  }
  res.json({
    purged: results.filter((item) => item.status === 200).length,
    results
  });
});

router.delete('/:id', requireAuth, async (req, res) => {
  if (!(await verifyOrReject(req.admin._id, req.body.pin))) {
    return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  }
  const entry = await RecycleBin.findById(req.params.id).populate('qrCode').populate('collection').populate('upload');
  if (!entry) return res.status(404).json({ message: 'Recycle item not found.' });
  const result = await purgeEntry(entry);
  return res.status(result.status).json({ message: result.message });
});

export default router;
