import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Admin } from '../models/Admin.js';
import { Collection } from '../models/Collection.js';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { RecycleBin } from '../models/RecycleBin.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

router.get('/overview', requireAuth, async (req, res) => {
  const [admin, totalCollections, totalQrs, activeUploads, recycleItems, storage, recentActivity] = await Promise.all([
    Admin.findById(req.admin._id).lean(),
    Collection.countDocuments({ status: { $ne: 'deleted' } }),
    QRCode.countDocuments({ status: { $ne: 'deleted' } }),
    Upload.countDocuments({ status: { $ne: 'deleted' } }),
    RecycleBin.countDocuments(),
    Upload.aggregate([
      { $match: { status: { $ne: 'deleted' } } },
      { $group: { _id: null, bytes: { $sum: '$sizeBytes' } } }
    ]),
    ActivityLog.find().sort({ createdAt: -1 }).limit(6).lean()
  ]);

  res.json({
    account: {
      email: admin.email,
      createdAt: admin.createdAt,
      lastLoginAt: admin.lastLoginAt,
      passwordChangedAt: admin.passwordChangedAt
    },
    storage: {
      totalCollections,
      totalQrs,
      activeUploads,
      recycleItems,
      usageBytes: storage[0]?.bytes || 0
    },
    activity: recentActivity
  });
});

router.get('/export', requireAuth, async (req, res) => {
  const [collections, qrcodes, uploads, recycleItems] = await Promise.all([
    Collection.find().lean(),
    QRCode.find().lean(),
    Upload.find().lean(),
    RecycleBin.find().lean()
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    collections,
    qrcodes,
    uploads,
    recycleItems
  };

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="dynamic-qr-export-${Date.now()}.json"`);
  res.send(JSON.stringify(payload, null, 2));
});

export default router;
