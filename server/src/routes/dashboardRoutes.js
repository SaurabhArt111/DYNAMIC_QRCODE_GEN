import express from 'express';
import { QRCode } from '../models/QRCode.js';
import { Collection } from '../models/Collection.js';
import { Upload } from '../models/Upload.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

router.get('/', requireAuth, async (req, res) => {
  const [totalQrCodes, activeQrCodes, totalCollections, storage, recentActivity] = await Promise.all([
    QRCode.countDocuments({ status: { $ne: 'deleted' } }),
    QRCode.countDocuments({ status: 'active' }),
    Collection.countDocuments({ status: { $ne: 'deleted' } }),
    Upload.aggregate([{ $group: { _id: null, bytes: { $sum: '$sizeBytes' } } }]),
    ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean()
  ]);

  res.json({
    totalQrCodes,
    activeQrCodes,
    totalCollections,
    storageUsageBytes: storage[0]?.bytes || 0,
    recentActivity
  });
});

export default router;
