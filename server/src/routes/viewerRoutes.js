import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { QRCode } from '../models/QRCode.js';
import { Upload } from '../models/Upload.js';
import { Collection } from '../models/Collection.js';
import { isPreviewableDocument } from '../utils/fileTypes.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

const missingFileMessage = 'This file has been deleted, removed, or is no longer available.';

async function resolveVault(token) {
  const qr = await QRCode.findOne({ token }).lean();
  if (!qr) return null;
  if (qr.status !== 'active') return { qr, uploads: [], unavailable: qr.status };
  const uploads = await Upload.find({ qrCode: qr._id }).sort({ order: 1 }).lean();
  return { qr, uploads, unavailable: null };
}

function mapUpload(upload, token, isCollectionPdf = false) {
  return {
    id: upload._id,
    originalName: upload.originalName,
    mimeType: upload.mimeType,
    category: upload.category,
    sizeBytes: upload.sizeBytes,
    viewUrl: `/api/vault/${token}/files/${upload._id}/view`,
    downloadUrl: `/api/vault/${token}/files/${upload._id}/download`,
    previewable: upload.category !== 'document' || isPreviewableDocument(upload.mimeType),
    isCollectionPdf
  };
}

async function fileExists(filePath) {
  try {
    const stat = await fs.stat(path.resolve(filePath));
    return stat.isFile();
  } catch (err) {
    if (err.code === 'ENOENT') return false;
    throw err;
  }
}

function sendMissingFile(res) {
  return res.status(404).json({
    status: 'missing_file',
    message: missingFileMessage
  });
}

async function ensureFileExists(filePath, res) {
  if (await fileExists(filePath)) return true;
  sendMissingFile(res);
  return false;
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

  // Build uploads list: owned files first, then collection PDF appended
  let allUploads = vault.uploads.map((u) => mapUpload(u, req.params.token, false));

  if (vault.qr.collection) {
    const col = await Collection.findById(vault.qr.collection).lean();
    if (col && col.defaultPdf) {
      allUploads.push({
        id: `col-pdf-${col._id}`,
        originalName: col.defaultPdf.originalName,
        mimeType: col.defaultPdf.mimeType,
        category: 'pdf',
        sizeBytes: col.defaultPdf.sizeBytes,
        viewUrl: `/api/vault/${req.params.token}/collection-pdf/${col._id}/view`,
        downloadUrl: `/api/vault/${req.params.token}/collection-pdf/${col._id}/download`,
        previewable: true,
        isCollectionPdf: true
      });
    }
  }

  res.json({
    status: 'active',
    qr: {
      id: vault.qr._id,
      name: vault.qr.name,
      description: vault.qr.description,
      updatedAt: vault.qr.updatedAt
    },
    uploads: allUploads
  });
});

router.get('/:token/files/:uploadId/view', async (req, res) => {
  const vault = await resolveVault(req.params.token);
  if (!vault || vault.unavailable) return res.status(404).json({ message: 'QR content not found.' });
  const upload = vault.uploads.find((item) => String(item._id) === req.params.uploadId);
  if (!upload) return res.status(404).json({ message: 'File not found.' });
  if (!(await ensureFileExists(upload.path, res))) return;
  res.setHeader('Content-Type', upload.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(upload.path), (err) => {
    if (err && !res.headersSent) sendMissingFile(res);
  });
});

router.get('/:token/files/:uploadId/download', async (req, res) => {
  const vault = await resolveVault(req.params.token);
  if (!vault || vault.unavailable) return res.status(404).json({ message: 'QR content not found.' });
  const upload = vault.uploads.find((item) => String(item._id) === req.params.uploadId);
  if (!upload) return res.status(404).json({ message: 'File not found.' });
  if (!(await ensureFileExists(upload.path, res))) return;
  res.download(path.resolve(upload.path), upload.originalName, (err) => {
    if (err && !res.headersSent) sendMissingFile(res);
  });
});

router.get('/:token/collection-pdf/:collectionId/view', async (req, res) => {
  const col = await Collection.findById(req.params.collectionId).lean();
  if (!col || !col.defaultPdf) return res.status(404).json({ message: 'Collection PDF not found.' });
  if (!(await ensureFileExists(col.defaultPdf.path, res))) return;
  res.setHeader('Content-Type', col.defaultPdf.mimeType);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.sendFile(path.resolve(col.defaultPdf.path), (err) => {
    if (err && !res.headersSent) sendMissingFile(res);
  });
});

router.get('/:token/collection-pdf/:collectionId/download', async (req, res) => {
  const col = await Collection.findById(req.params.collectionId).lean();
  if (!col || !col.defaultPdf) return res.status(404).json({ message: 'Collection PDF not found.' });
  if (!(await ensureFileExists(col.defaultPdf.path, res))) return;
  res.download(path.resolve(col.defaultPdf.path), col.defaultPdf.originalName, (err) => {
    if (err && !res.headersSent) sendMissingFile(res);
  });
});

export default router;
