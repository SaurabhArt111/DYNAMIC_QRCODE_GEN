import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity(action, qrCode, message, metadata = {}) {
  // Only log QR-related actions, not file actions
  const qrActions = ['QR_CREATED', 'QR_MODIFIED', 'QR_DELETED', 'QR_RESTORED', 'QR_PURGED'];
  if (!qrActions.includes(action)) return;
  await ActivityLog.create({ action, qrCode, message, metadata });
}
