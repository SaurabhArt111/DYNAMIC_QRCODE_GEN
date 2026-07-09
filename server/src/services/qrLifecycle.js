import mongoose from 'mongoose';
import { Collection } from '../models/Collection.js';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { RecycleBin } from '../models/RecycleBin.js';
import { getFileCategory } from '../utils/fileTypes.js';
import { logActivity } from '../utils/activity.js';
import { removeUploadFile } from '../utils/storage.js';

export function normalizeFileSize(file) {
  const size = Number(file?.size ?? file?.sizeBytes ?? 0);
  return Number.isFinite(size) && size >= 0 ? size : 0;
}

export function normalizeQrId(qrId) {
  if (!qrId) return null;
  if (qrId instanceof mongoose.Types.ObjectId) return qrId;
  if (typeof qrId === 'string' && /^[a-f\d]{24}$/i.test(qrId)) {
    return new mongoose.Types.ObjectId(qrId);
  }
  return qrId;
}

export function buildUploadDoc(file, qrId, order = 0) {
  return {
    qrCode: qrId,
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: normalizeFileSize(file),
    category: getFileCategory(file.mimetype),
    path: file.path,
    order
  };
}

export async function recalculateQrSize(qrId) {
  const normalizedQrId = normalizeQrId(qrId);
  const result = await Upload.aggregate([
    { $match: { qrCode: normalizedQrId, status: { $ne: 'deleted' } } },
    { $group: { _id: '$qrCode', bytes: { $sum: '$sizeBytes' } } }
  ]);
  await QRCode.findByIdAndUpdate(normalizedQrId, { sizeBytes: result[0]?.bytes || 0 });
}

export async function moveQrToRecycle(qrId, adminId, options = {}) {
  const qr = await QRCode.findById(qrId);
  if (!qr || qr.status === 'deleted') return null;

  const deletedAt = options.deletedAt || new Date();
  qr.status = 'deleted';
  qr.deletedAt = deletedAt;
  qr.deletedByCollection = options.collectionId || null;
  await qr.save();

  await RecycleBin.updateOne(
    { qrCode: qr._id },
    {
      itemType: 'qr',
      qrCode: qr._id,
      deletedBy: adminId,
      deletedAt,
      snapshot: qr.toObject()
    },
    { upsert: true }
  );

  if (!options.skipActivity) {
    await logActivity('QR_DELETED', qr._id, `QR moved to recycle bin: ${qr.name}`);
  }

  return qr;
}

export async function moveCollectionToRecycle(collectionId, adminId) {
  const collection = await Collection.findById(collectionId);
  if (!collection || collection.status === 'deleted') return null;

  const deletedAt = new Date();
  collection.status = 'deleted';
  collection.deletedAt = deletedAt;
  await collection.save();

  await RecycleBin.updateOne(
    { collection: collection._id },
    {
      itemType: 'collection',
      collection: collection._id,
      deletedBy: adminId,
      deletedAt,
      snapshot: collection.toObject()
    },
    { upsert: true }
  );

  const qrs = await QRCode.find({ collection: collection._id, status: { $ne: 'deleted' } }).select('_id');
  await Promise.all(
    qrs.map((qr) => moveQrToRecycle(qr._id, adminId, { collectionId: collection._id, deletedAt, skipActivity: true }))
  );

  await logActivity('COLLECTION_DELETED', collection._id, `Collection moved to recycle bin: ${collection.name}`);
  return collection;
}

export async function restoreQrFromRecycle(entry) {
  if (!entry.qrCode) return false;
  entry.qrCode.status = 'active';
  entry.qrCode.deletedAt = null;
  entry.qrCode.deletedByCollection = null;
  await entry.qrCode.save();
  await RecycleBin.deleteOne({ _id: entry._id });
  await logActivity('QR_RESTORED', entry.qrCode._id, `QR restored: ${entry.qrCode.name}`);
  return true;
}

export async function restoreCollectionCascade(entry) {
  if (!entry.collection) return false;

  entry.collection.status = 'active';
  entry.collection.deletedAt = null;
  await entry.collection.save();

  const cascadeQrs = await QRCode.find({
    collection: entry.collection._id,
    status: 'deleted',
    deletedByCollection: entry.collection._id
  });

  if (cascadeQrs.length) {
    await QRCode.updateMany(
      { _id: { $in: cascadeQrs.map((qr) => qr._id) } },
      { $set: { status: 'active', deletedAt: null, deletedByCollection: null } }
    );
    await RecycleBin.deleteMany({ itemType: 'qr', qrCode: { $in: cascadeQrs.map((qr) => qr._id) } });
  }

  await RecycleBin.deleteOne({ _id: entry._id });
  await logActivity('COLLECTION_RESTORED', entry.collection._id, `Collection restored: ${entry.collection.name}`);
  return true;
}

export async function purgeQrCascade(qrId) {
  const uploads = await Upload.find({ qrCode: qrId });
  await Promise.all(uploads.map((upload) => removeUploadFile(upload.path).catch(() => {})));
  await RecycleBin.deleteMany({ itemType: 'upload', upload: { $in: uploads.map((upload) => upload._id) } });
  await Upload.deleteMany({ qrCode: qrId });
  await RecycleBin.deleteOne({ itemType: 'qr', qrCode: qrId });
  await QRCode.deleteOne({ _id: qrId });
}

export async function purgeCollectionCascade(entry) {
  if (!entry.collection) return false;

  const qrs = await QRCode.find({ collection: entry.collection._id }).select('_id');
  await Promise.all(qrs.map((qr) => purgeQrCascade(qr._id)));

  if (entry.collection.defaultPdf?.path) {
    await removeUploadFile(entry.collection.defaultPdf.path).catch(() => {});
  }

  await RecycleBin.deleteMany({ itemType: 'qr', qrCode: { $in: qrs.map((qr) => qr._id) } });
  await Collection.deleteOne({ _id: entry.collection._id });
  await RecycleBin.deleteOne({ _id: entry._id });
  await logActivity('COLLECTION_PURGED', entry.collection._id, `Collection permanently deleted: ${entry.collection.name}`);
  return true;
}
