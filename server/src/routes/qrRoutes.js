import express from 'express';
import QRCodeImage from 'qrcode';
import xlsx from 'xlsx';
import { requireAuth } from '../middleware/auth.js';
import { qrUpload, excelUpload, handleUploadErrors } from '../middleware/upload.js';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { RecycleBin } from '../models/RecycleBin.js';
import { Analytics } from '../models/Analytics.js';
import { createVaultToken } from '../utils/tokens.js';
import { getFileCategory } from '../utils/fileTypes.js';
import { logActivity } from '../utils/activity.js';
import { removeUploadFile } from '../utils/storage.js';
import { env } from '../config/env.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

function vaultUrl(token) {
  return `${env.publicBaseUrl}/vault/${token}`;
}

function mapQr(qr) {
  return {
    ...qr,
    vaultUrl: vaultUrl(qr.token)
  };
}

async function createUniqueToken() {
  for (let i = 0; i < 5; i += 1) {
    const token = createVaultToken();
    const exists = await QRCode.exists({ token });
    if (!exists) return token;
  }
  throw new Error('Unable to generate unique QR token.');
}

async function recalculateSize(qrId) {
  const result = await Upload.aggregate([
    { $match: { qrCode: qrId } },
    { $group: { _id: '$qrCode', bytes: { $sum: '$sizeBytes' } } }
  ]);
  await QRCode.findByIdAndUpdate(qrId, { sizeBytes: result[0]?.bytes || 0 });
}

async function moveQrToRecycle(qrId, adminId) {
  const qr = await QRCode.findById(qrId);
  if (!qr || qr.status === 'deleted') return null;

  qr.status = 'deleted';
  qr.deletedAt = new Date();
  await qr.save();

  await RecycleBin.updateOne(
    { qrCode: qr._id },
    { qrCode: qr._id, deletedBy: adminId, deletedAt: qr.deletedAt, snapshot: qr.toObject() },
    { upsert: true }
  );
  await logActivity('QR_DELETED', qr._id, `QR moved to recycle bin: ${qr.name}`);

  return qr;
}

router.get('/', requireAuth, async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 12), 1), 50);
  const search = String(req.query.search || '').trim();
  const filter = String(req.query.filter || 'new');
  const query = { status: { $ne: 'deleted' } };

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { token: { $regex: search, $options: 'i' } }
    ];
  }

  const sorts = {
    active: { status: 1, createdAt: -1 },
    new: { createdAt: -1 },
    old: { createdAt: 1 },
    az: { name: 1 },
    za: { name: -1 },
    popular: { scanCount: -1 },
    edited: { updatedAt: -1 },
    scanned: { lastScannedAt: -1 }
  };

  const [items, total] = await Promise.all([
    QRCode.find(query)
      .sort(sorts[filter] || sorts.new)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    QRCode.countDocuments(query)
  ]);

  res.json({ items: items.map(mapQr), total, page, pages: Math.ceil(total / limit) });
});

router.post('/', requireAuth, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'QR name is required.' });

  const qr = await QRCode.create({
    name,
    description,
    token: await createUniqueToken()
  });

  await logActivity('QR_CREATED', qr._id, `QR created: ${qr.name}`);
  res.status(201).json(mapQr(qr.toObject()));
});

router.post('/bulk', requireAuth, excelUpload.single('file'), handleUploadErrors, async (req, res) => {
  const workbook = xlsx.readFile(req.file.path);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet);
  const created = [];

  for (const row of rows) {
    const name = row['QR Name'] || row.name || row.Name;
    const description = row.Description || row.description || '';
    if (!name) continue;
    created.push({
      name: String(name),
      description: String(description),
      token: await createUniqueToken()
    });
  }

  await removeUploadFile(req.file.path);
  if (!created.length) return res.status(400).json({ message: 'No valid rows found.' });

  const docs = await QRCode.insertMany(created);
  await logActivity('QR_CREATED', null, `Bulk generated ${docs.length} QR codes`);
  res.status(201).json({ count: docs.length, items: docs.map((doc) => mapQr(doc.toObject())) });
});

router.get('/:id', requireAuth, async (req, res) => {
  const qr = await QRCode.findById(req.params.id).lean();
  if (!qr || qr.status === 'deleted') return res.status(404).json({ message: 'QR not found.' });
  const uploads = await Upload.find({ qrCode: qr._id }).sort({ order: 1 }).lean();
  res.json({ qr: mapQr(qr), uploads });
});

router.put('/:id', requireAuth, async (req, res) => {
  const qr = await QRCode.findById(req.params.id);
  if (!qr || qr.status === 'deleted') return res.status(404).json({ message: 'QR not found.' });

  qr.name = req.body.name || qr.name;
  qr.description = req.body.description ?? qr.description;
  qr.status = req.body.status || qr.status;
  await qr.save();

  await logActivity('QR_MODIFIED', qr._id, `QR modified: ${qr.name}`);
  res.json(mapQr(qr.toObject()));
});

router.post('/:id/files', requireAuth, qrUpload.array('files', 4), handleUploadErrors, async (req, res) => {
  const qr = await QRCode.findById(req.params.id);
  if (!qr || qr.status === 'deleted') return res.status(404).json({ message: 'QR not found.' });

  const existing = await Upload.countDocuments({ qrCode: qr._id });
  if (existing + req.files.length > 4) {
    await Promise.all(req.files.map((file) => removeUploadFile(file.path)));
    return res.status(400).json({ message: 'Each QR can contain a maximum of 4 files.' });
  }

  const docs = await Upload.insertMany(
    req.files.map((file, index) => ({
      qrCode: qr._id,
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      category: getFileCategory(file.mimetype),
      path: file.path,
      order: existing + index
    }))
  );

  await recalculateSize(qr._id);
  await logActivity('FILES_UPDATED', qr._id, `Files added to ${qr.name}`);
  res.status(201).json({ uploads: docs });
});

router.put('/:id/files/reorder', requireAuth, async (req, res) => {
  const qr = await QRCode.findById(req.params.id);
  if (!qr || qr.status === 'deleted') return res.status(404).json({ message: 'QR not found.' });

  const orderedIds = Array.isArray(req.body.uploadIds) ? req.body.uploadIds : [];
  const uploads = await Upload.find({ qrCode: qr._id });
  const uploadIds = uploads.map((upload) => String(upload._id));
  const hasSameUploads = orderedIds.length === uploadIds.length && uploadIds.every((uploadId) => orderedIds.includes(uploadId));

  if (!hasSameUploads) {
    return res.status(400).json({ message: 'Upload order does not match the QR files.' });
  }

  await Promise.all(
    orderedIds.map((uploadId, index) => Upload.updateOne({ _id: uploadId, qrCode: qr._id }, { order: index }))
  );
  await logActivity('FILES_UPDATED', qr._id, `Files reordered for ${qr.name}`);
  const reordered = await Upload.find({ qrCode: qr._id }).sort({ order: 1 }).lean();
  res.json({ uploads: reordered });
});

router.put('/:id/files/:uploadId/replace', requireAuth, qrUpload.single('file'), handleUploadErrors, async (req, res) => {
  const upload = await Upload.findOne({ _id: req.params.uploadId, qrCode: req.params.id });
  if (!upload) return res.status(404).json({ message: 'Upload not found.' });

  await removeUploadFile(upload.path);
  upload.originalName = req.file.originalname;
  upload.storedName = req.file.filename;
  upload.mimeType = req.file.mimetype;
  upload.sizeBytes = req.file.size;
  upload.category = getFileCategory(req.file.mimetype);
  upload.path = req.file.path;
  await upload.save();

  await recalculateSize(upload.qrCode);
  await logActivity('FILES_UPDATED', upload.qrCode, `File replaced: ${upload.originalName}`);
  res.json({ upload });
});

router.delete('/:id/files/:uploadId', requireAuth, async (req, res) => {
  const upload = await Upload.findOneAndDelete({ _id: req.params.uploadId, qrCode: req.params.id });
  if (!upload) return res.status(404).json({ message: 'Upload not found.' });

  await removeUploadFile(upload.path);
  await recalculateSize(upload.qrCode);
  await logActivity('FILES_UPDATED', upload.qrCode, `File removed: ${upload.originalName}`);
  res.json({ message: 'File removed.' });
});

router.get('/:id/qr-image', requireAuth, async (req, res) => {
  const qr = await QRCode.findById(req.params.id).lean();
  if (!qr || qr.status === 'deleted') return res.status(404).json({ message: 'QR not found.' });
  const png = await QRCodeImage.toBuffer(vaultUrl(qr.token), { width: 1200, margin: 2 });
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${qr.name.replace(/[^a-z0-9]/gi, '-')}.png"`);
  res.send(png);
});

router.post('/:id/recycle', requireAuth, async (req, res) => {
  const qr = await moveQrToRecycle(req.params.id, req.admin._id);
  if (!qr) return res.status(404).json({ message: 'QR not found.' });
  res.json({ message: 'QR moved to recycle bin.' });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const qr = await moveQrToRecycle(req.params.id, req.admin._id);
  if (!qr) return res.status(404).json({ message: 'QR not found.' });
  res.json({ message: 'QR moved to recycle bin.' });
});

export default router;
