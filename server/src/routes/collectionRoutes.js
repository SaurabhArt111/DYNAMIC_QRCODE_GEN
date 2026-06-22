import express from 'express';
import path from 'path';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { Collection } from '../models/Collection.js';
import { QRCode } from '../models/QRCode.js';
import { uploadRoot, removeUploadFile } from '../utils/storage.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const pdfUpload = multer({
  storage: multer.diskStorage({
    destination: uploadRoot,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `col-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
  }),
  limits: { files: 1, fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('Only PDF files are allowed as collection default.'), ok);
  }
});

function handlePdfError(err, req, res, next) {
  if (!err) return next();
  res.status(400).json({ message: err.message || 'File upload error.' });
}

const router = asyncRouter(express.Router());

router.get('/', requireAuth, async (req, res) => {
  const items = await Collection.find().sort({ createdAt: -1 }).lean();
  res.json({ items });
});

router.post('/', requireAuth, pdfUpload.single('defaultPdf'), handlePdfError, async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ message: 'Collection name is required.' });

  const data = { name, description: description || '' };

  if (req.file) {
    data.defaultPdf = {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      path: req.file.path
    };
  }

  const col = await Collection.create(data);
  res.status(201).json({ collection: col.toObject() });
});

router.put('/:id', requireAuth, pdfUpload.single('defaultPdf'), handlePdfError, async (req, res) => {
  const col = await Collection.findById(req.params.id);
  if (!col) return res.status(404).json({ message: 'Collection not found.' });

  col.name = req.body.name || col.name;
  col.description = req.body.description ?? col.description;

  if (req.file) {
    // Remove old PDF if exists
    if (col.defaultPdf?.path) {
      await removeUploadFile(col.defaultPdf.path).catch(() => {});
    }
    col.defaultPdf = {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      path: req.file.path
    };
  }

  if (req.body.removePdf === 'true' && col.defaultPdf) {
    await removeUploadFile(col.defaultPdf.path).catch(() => {});
    col.defaultPdf = undefined;
  }

  await col.save();
  res.json({ collection: col.toObject() });
});

router.delete('/:id', requireAuth, async (req, res) => {
  const col = await Collection.findById(req.params.id);
  if (!col) return res.status(404).json({ message: 'Collection not found.' });

  // Unlink QR codes from this collection (don't delete them)
  await QRCode.updateMany({ collection: col._id }, { $set: { collection: null } });

  if (col.defaultPdf?.path) {
    await removeUploadFile(col.defaultPdf.path).catch(() => {});
  }
  await Collection.deleteOne({ _id: col._id });
  res.json({ message: 'Collection deleted.' });
});

router.get('/:id/qrcodes', requireAuth, async (req, res) => {
  const col = await Collection.findById(req.params.id).lean();
  if (!col) return res.status(404).json({ message: 'Collection not found.' });

  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 20), 1), 100);
  const search = String(req.query.search || '').trim();

  const query = { collection: col._id, status: { $ne: 'deleted' } };
  if (search) {
    query.$or = [{ name: { $regex: search, $options: 'i' } }, { token: { $regex: search, $options: 'i' } }];
  }

  const [items, total] = await Promise.all([
    QRCode.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    QRCode.countDocuments(query)
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit), collection: col });
});

export default router;
