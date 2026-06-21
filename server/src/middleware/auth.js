import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';

export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required.' });
    }

    const payload = jwt.verify(token, env.jwtSecret);
    const admin = await Admin.findById(payload.sub).select('-passwordHash -recyclePinHash');

    if (!admin) {
      return res.status(401).json({ message: 'Invalid session.' });
    }

    req.admin = admin;
    next();
  } catch {
    res.status(401).json({ message: 'Session expired. Please login again.' });
  }
}
