import express from 'express';
import path from 'path';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { isPreviewableDocument } from '../utils/fileTypes.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

function mapCollectionDefaultFile(collection) {
  if (!collection?.defaultFile) return null;
  return {
    _id: `collection-default-${collection._id}`,
    originalName: collection.defaultFile.originalName,
    storedName: collection.defaultFile.storedName,
    mimeType: collection.defaultFile.mimeType,
    sizeBytes: collection.defaultFile.sizeBytes,
    category: collection.defaultFile.category,
    path: collection.defaultFile.path,
    isCollectionDefault: true
  };
}

async function resolveVault(token) {
  const qr = await QRCode.findOne({ token }).populate('collection').lean();
  if (!qr) return null;
  if (qr.status !== 'active') return { qr, uploads: [], unavailable: qr.status };
  const uploads = await Upload.find({ qrCode: qr._id }).sort({ order: 1 }).lean();
  const defaultFile = mapCollectionDefaultFile(qr.collection);
  if (defaultFile) uploads.push(defaultFile);
  return { qr, uploads, unavailable: null };
}

router.get('/:token', async (req, res) => {
  const vault = await resolveVault(req.params.token);
  if (!vault) return res.status(404).json({ status: 'missing', message: 'QR content not found.' });

  if (vault.unavailable) {
    return res.json({
      status: vault.unavailable,
      message: vault.unavailable === 'deleted' ? 'This QR code has been deleted.' : 'This QR code is inactive.'
    });
  }

  res.json({
    status: 'active',
    qr: {
      id: vault.qr._id,
      name: vault.qr.name,
      description: vault.qr.description,
      updatedAt: vault.qr.updatedAt
    },
    uploads: vault.uploads.map((upload) => ({
      id: upload._id,
      originalName: upload.originalName,
      mimeType: upload.mimeType,
      category: upload.category,
      sizeBytes: upload.sizeBytes,
      viewUrl: `/api/vault/${req.params.token}/files/${upload._id}/view`,
      downloadUrl: `/api/vault/${req.params.token}/files/${upload._id}/download`,
      previewable: upload.category !== 'document' || isPreviewableDocument(upload.mimeType)
    }))
  });
});

router.get('/:token/files/:uploadId/view', async (req, res) => {
  const vault = await resolveVault(req.params.token);
  if (!vault || vault.unavailable) return res.status(404).json({ message: 'QR content not found.' });

  const upload = vault.uploads.find((item) => String(item._id) === req.params.uploadId);
  if (!upload) return res.status(404).json({ message: 'File not found.' });

  res.setHeader('Content-Type', upload.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(upload.path));
});

router.get('/:token/files/:uploadId/download', async (req, res) => {
  const vault = await resolveVault(req.params.token);
  if (!vault || vault.unavailable) return res.status(404).json({ message: 'QR content not found.' });

  const upload = vault.uploads.find((item) => String(item._id) === req.params.uploadId);
  if (!upload) return res.status(404).json({ message: 'File not found.' });

  res.download(path.resolve(upload.path), upload.originalName);
});

export default router;
