import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity(action, qrCode, message, metadata = {}) {
  await ActivityLog.create({
    action,
    qrCode,
    message,
    metadata
  });
}
