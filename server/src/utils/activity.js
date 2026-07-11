import { ActivityLog } from '../models/ActivityLog.js';

// Keep the activity feed lightweight: only the most recent entries are ever
// useful to an admin, so older ones are pruned automatically.
const ACTIVITY_LOG_MAX = 40;

export async function logActivity(action, qrCode, message, metadata = {}) {
  // Only log QR-related actions, not file actions
  const qrActions = ['QR_CREATED', 'QR_MODIFIED', 'QR_DELETED', 'QR_RESTORED', 'QR_PURGED'];
  if (!qrActions.includes(action)) return;
  await ActivityLog.create({ action, qrCode, message, metadata });
  await pruneActivityLog();
}

async function pruneActivityLog() {
  const count = await ActivityLog.countDocuments();
  if (count <= ACTIVITY_LOG_MAX) return;
  const keep = await ActivityLog.find().sort({ _id: -1 }).limit(ACTIVITY_LOG_MAX).select('_id').lean();
  await ActivityLog.deleteMany({ _id: { $nin: keep.map((doc) => doc._id) } });
}
