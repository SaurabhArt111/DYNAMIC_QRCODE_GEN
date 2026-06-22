import express from 'express';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { Collection } from '../models/Collection.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

router.get('/', requireAuth, async (req, res) => {
  const qrActivityActions = ['QR_CREATED', 'QR_MODIFIED', 'QR_DELETED', 'QR_RESTORED', 'QR_PURGED'];
  const [totalQrCodes, activeQrCodes, uploadStorage, collectionStorage, recentActivity] =
    await Promise.all([
      QRCode.countDocuments({ status: { $ne: 'deleted' } }),
      QRCode.countDocuments({ status: 'active' }),
      Upload.aggregate([{ $group: { _id: null, bytes: { $sum: '$sizeBytes' } } }]),
      Collection.aggregate([{ $group: { _id: null, bytes: { $sum: '$defaultFile.sizeBytes' } } }]),
      ActivityLog.find({ action: { $in: qrActivityActions } }).sort({ createdAt: -1 }).limit(10).lean()
    ]);

  res.json({
    totalQrCodes,
    activeQrCodes,
    storageUsageBytes: (uploadStorage[0]?.bytes || 0) + (collectionStorage[0]?.bytes || 0),
    recentActivity
  });
});

export default router;
