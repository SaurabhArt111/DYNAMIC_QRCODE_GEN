import multer from 'multer';
import path from 'path';
import { env } from '../config/env.js';
import { getFileCategory } from '../utils/fileTypes.js';
import { uploadRoot } from '../utils/storage.js';

const storage = multer.diskStorage({
  destination: uploadRoot,
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

function fileFilter(req, file, cb) {
  if (!getFileCategory(file.mimetype)) {
    return cb(new Error('Unsupported file type.'));
  }
  cb(null, true);
}

export const qrUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 4,
    fileSize: env.maxFileSizeMb * 1024 * 1024
  }
});

export const bulkQrUpload = multer({
  storage,
  fileFilter,
  limits: {
    files: 1500,
    fileSize: env.maxFileSizeMb * 1024 * 1024
  }
});

export const collectionPdfUpload = multer({
  storage,
  limits: {
    files: 1,
    fileSize: env.maxFileSizeMb * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf';
    cb(ok ? null : new Error('Please upload a PDF file.'), ok);
  }
});

export const excelUpload = multer({
  storage,
  limits: {
    files: 1,
    fileSize: env.maxFileSizeMb * 1024 * 1024
  },
  fileFilter: (req, file, cb) => {
    const ok =
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    cb(ok ? null : new Error('Please upload an Excel file.'), ok);
  }
});

export function handleUploadErrors(err, req, res, next) {
  if (!err) return next();

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: `Maximum allowed file size is ${env.maxFileSizeMb} MB.`,
      details: ['File upload rejected.', 'Please compress the file and try again.']
    });
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({ message: 'Too many files were selected for this action.' });
  }

  res.status(400).json({ message: err.message || 'File upload rejected.' });
}
