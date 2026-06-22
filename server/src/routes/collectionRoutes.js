import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { bulkQrUpload, collectionPdfUpload, handleUploadErrors } from '../middleware/upload.js';
import { Collection } from '../models/Collection.js';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { createVaultToken } from '../utils/tokens.js';
import { getFileCategory } from '../utils/fileTypes.js';
import { removeUploadFile } from '../utils/storage.js';
import { logActivity } from '../utils/activity.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

async function createUniqueToken() {
  for (let i = 0; i < 5; i += 1) {
    const token = createVaultToken();
    const exists = await QRCode.exists({ token });
    if (!exists) return token;
  }
  throw new Error('Unable to generate unique QR token.');
}

function mapDefaultFile(file) {
  if (!file) return null;
  return {
    originalName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    category: file.category
  };
}

function mapCollection(collection, qrCount = 0) {
  return {
    _id: collection._id,
    name: collection.name,
    description: collection.description,
    defaultFile: mapDefaultFile(collection.defaultFile),
    qrCount,
    createdAt: collection.createdAt,
    updatedAt: collection.updatedAt
  };
}

function uploadedPdf(file) {
  if (!file) return undefined;
  return {
    originalName: file.originalname,
    storedName: file.filename,
    mimeType: file.mimetype,
    sizeBytes: file.size,
    category: 'pdf',
    path: file.path
  };
}

function folderNameFromUpload(file) {
  const relativePath = file.originalname || file.filename;
  const parts = relativePath.split(/[\\/]/).filter(Boolean);
  return parts.length > 1 ? parts[0] : null;
}

router.get('/', requireAuth, async (req, res) => {
  const [collections, counts] = await Promise.all([
    Collection.find().sort({ updatedAt: -1 }).lean(),
    QRCode.aggregate([
      { $match: { status: { $ne: 'deleted' }, collection: { $ne: null } } },
      { $group: { _id: '$collection', count: { $sum: 1 } } }
    ])
  ]);
  const countMap = new Map(counts.map((item) => [String(item._id), item.count]));
  res.json({ items: collections.map((collection) => mapCollection(collection, countMap.get(String(collection._id)) || 0)) });
});

router.post('/', requireAuth, collectionPdfUpload.single('defaultPdf'), handleUploadErrors, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) {
    await removeUploadFile(req.file?.path);
    return res.status(400).json({ message: 'Collection name is required.' });
  }

  const collection = await Collection.create({
    name,
    description: req.body.description || '',
    defaultFile: uploadedPdf(req.file)
  });

  res.status(201).json(mapCollection(collection.toObject()));
});

router.get('/:id', requireAuth, async (req, res) => {
  const collection = await Collection.findById(req.params.id).lean();
  if (!collection) return res.status(404).json({ message: 'Collection not found.' });

  const qrs = await QRCode.find({ collection: collection._id, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .lean();

  res.json({ collection: mapCollection(collection, qrs.length), qrs });
});

router.put('/:id', requireAuth, collectionPdfUpload.single('defaultPdf'), handleUploadErrors, async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) {
    await removeUploadFile(req.file?.path);
    return res.status(404).json({ message: 'Collection not found.' });
  }

  collection.name = req.body.name || collection.name;
  collection.description = req.body.description ?? collection.description;
  if (req.file) {
    await removeUploadFile(collection.defaultFile?.path);
    collection.defaultFile = uploadedPdf(req.file);
  }
  await collection.save();

  res.json(mapCollection(collection.toObject()));
});

router.delete('/:id/default-pdf', requireAuth, async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) return res.status(404).json({ message: 'Collection not found.' });

  await removeUploadFile(collection.defaultFile?.path);
  collection.defaultFile = undefined;
  await collection.save();
  res.json(mapCollection(collection.toObject()));
});

router.delete('/:id', requireAuth, async (req, res) => {
  const collection = await Collection.findById(req.params.id);
  if (!collection) return res.status(404).json({ message: 'Collection not found.' });

  const qrCount = await QRCode.countDocuments({ collection: collection._id, status: { $ne: 'deleted' } });
  if (qrCount > 0) {
    return res.status(400).json({ message: 'Move or delete QR codes in this collection before deleting it.' });
  }

  await removeUploadFile(collection.defaultFile?.path);
  await Collection.deleteOne({ _id: collection._id });
  res.json({ message: 'Collection deleted.' });
});

router.post('/:id/qrcodes', requireAuth, async (req, res) => {
  const collection = await Collection.findById(req.params.id).lean();
  if (!collection) return res.status(404).json({ message: 'Collection not found.' });

  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'QR name is required.' });

  const qr = await QRCode.create({
    name,
    description: req.body.description || '',
    collection: collection._id,
    token: await createUniqueToken()
  });

  await logActivity('QR_CREATED', qr._id, `QR created: ${qr.name}`);
  res.status(201).json(qr.toObject());
});

router.post('/:id/bulk-folders', requireAuth, bulkQrUpload.array('files', 1500), handleUploadErrors, async (req, res) => {
  const collection = await Collection.findById(req.params.id).lean();
  if (!collection) {
    await Promise.all((req.files || []).map((file) => removeUploadFile(file.path)));
    return res.status(404).json({ message: 'Collection not found.' });
  }

  const groups = new Map();
  for (const file of req.files || []) {
    const folderName = folderNameFromUpload(file);
    if (!folderName) {
      await removeUploadFile(file.path);
      continue;
    }
    if (!groups.has(folderName)) groups.set(folderName, []);
    groups.get(folderName).push(file);
  }

  if (!groups.size) {
    return res.status(400).json({ message: 'Select one or more folders that contain files.' });
  }

  const createdQrs = [];
  const createdUploads = [];

  for (const [folderName, files] of groups) {
    const qr = await QRCode.create({
      name: folderName,
      description: '',
      collection: collection._id,
      token: await createUniqueToken()
    });
    createdQrs.push(qr);

    const uploads = files.map((file, index) => ({
      qrCode: qr._id,
      originalName: file.originalname.split(/[\\/]/).filter(Boolean).slice(1).join('/') || file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      category: getFileCategory(file.mimetype),
      path: file.path,
      order: index
    }));
    createdUploads.push(...uploads);
    qr.sizeBytes = uploads.reduce((total, upload) => total + upload.sizeBytes, 0);
    await qr.save();
  }

  if (createdUploads.length) {
    await Upload.insertMany(createdUploads);
  }

  await logActivity('QR_CREATED', null, `Bulk generated ${createdQrs.length} QR codes in ${collection.name}`);
  res.status(201).json({ count: createdQrs.length });
});

export default router;
