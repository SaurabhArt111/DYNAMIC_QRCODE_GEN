import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncRouter } from '../utils/asyncRouter.js';

const router = asyncRouter(express.Router());

function signToken(admin) {
  return jwt.sign({ sub: admin._id, email: admin.email }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const admin = await Admin.findOne({ email: String(email || '').toLowerCase() });

  if (!admin || !(await bcrypt.compare(password || '', admin.passwordHash))) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  admin.lastLoginAt = new Date();
  await admin.save();

  res.json({
    token: signToken(admin),
    admin: { id: admin._id, email: admin.email, lastLoginAt: admin.lastLoginAt },
    appName: env.appName
  });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ admin: req.admin, appName: env.appName });
});

router.post('/change-password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must be at least 8 characters.' });
  }

  const admin = await Admin.findById(req.admin._id);
  if (!(await bcrypt.compare(currentPassword || '', admin.passwordHash))) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }

  admin.passwordHash = await bcrypt.hash(newPassword, 12);
  admin.passwordChangedAt = new Date();
  await admin.save();

  res.json({ message: 'Password changed successfully.' });
});

router.post('/verify-recycle-pin', requireAuth, async (req, res) => {
  const admin = await Admin.findById(req.admin._id);
  const ok = await bcrypt.compare(String(req.body.pin || ''), admin.recyclePinHash);
  if (!ok) return res.status(403).json({ message: 'Invalid recycle bin PIN.' });
  res.json({ verified: true });
});

router.post('/change-recycle-pin', requireAuth, async (req, res) => {
  const { currentPin, newPin } = req.body;
  if (!/^\d{4}$/.test(String(newPin || ''))) {
    return res.status(400).json({ message: 'Recycle bin PIN must be exactly 4 digits.' });
  }

  const admin = await Admin.findById(req.admin._id);
  const ok = await bcrypt.compare(String(currentPin || ''), admin.recyclePinHash);
  if (!ok) return res.status(403).json({ message: 'Current recycle bin PIN is incorrect.' });

  admin.recyclePinHash = await bcrypt.hash(String(newPin), 12);
  await admin.save();
  res.json({ message: 'Recycle bin PIN changed successfully.' });
});

export default router;
