import mongoose from 'mongoose';
import { QRCode } from '../models/QRCode.js';

export async function removeAnalyticsData() {
  await QRCode.updateMany(
    { $or: [{ scanCount: { $exists: true } }, { lastScannedAt: { $exists: true } }] },
    { $unset: { scanCount: '', lastScannedAt: '' } }
  );

  const collections = await mongoose.connection.db.listCollections({ name: 'analytics' }).toArray();
  if (collections.length) {
    await mongoose.connection.db.dropCollection('analytics');
  }
}
