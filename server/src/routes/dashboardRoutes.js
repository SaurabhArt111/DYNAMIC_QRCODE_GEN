import express from 'express';
import { startOfToday } from '../utils/time.js';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { Analytics } from '../models/Analytics.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

router.get('/', requireAuth, async (req, res) => {
  const [totalQrCodes, activeQrCodes, totalScans, todayScans, storage, recentActivity] =
    await Promise.all([
      QRCode.countDocuments({ status: { $ne: 'deleted' } }),
      QRCode.countDocuments({ status: 'active' }),
      Analytics.countDocuments({ event: 'scan' }),
      Analytics.countDocuments({ event: 'scan', createdAt: { $gte: startOfToday() } }),
      Upload.aggregate([{ $group: { _id: null, bytes: { $sum: '$sizeBytes' } } }]),
      ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean()
    ]);

  res.json({
    totalQrCodes,
    activeQrCodes,
    totalScans,
    todayScans,
    storageUsageBytes: storage[0]?.bytes || 0,
    recentActivity
  });
});

export default router;
