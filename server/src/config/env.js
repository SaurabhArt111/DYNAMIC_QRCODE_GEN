import dotenv from 'dotenv';

dotenv.config();

export const env = {
  appName: process.env.APP_NAME || 'DynamicVault QR',
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dynamicvault_qr',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  // The standalone public viewer app (what a "SCAN ME" QR actually opens on
  // a visitor's phone) is deployed separately from the admin dashboard so
  // scanning a code doesn't download the whole admin bundle.
  viewerUrl: process.env.VIEWER_URL || 'http://localhost:5174',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5000',
  adminEmail: process.env.ADMIN_EMAIL || 'admin@dynamicvault.local',
  adminPassword: process.env.ADMIN_PASSWORD || 'ChangeMe123!',
  recyclePin: process.env.RECYCLE_PIN || '1234',
  defaultFileSizeMb: Number(process.env.DEFAULT_FILE_SIZE_MB || 5),
  maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB || 10)
};
