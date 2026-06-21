import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db.js';
import { env } from '../config/env.js';
import { Admin } from '../models/Admin.js';

await connectDb();

const existing = await Admin.findOne({ email: env.adminEmail.toLowerCase() });

if (existing) {
  console.log(`Admin already exists: ${existing.email}`);
  process.exit(0);
}

await Admin.create({
  email: env.adminEmail.toLowerCase(),
  passwordHash: await bcrypt.hash(env.adminPassword, 12),
  recyclePinHash: await bcrypt.hash(env.recyclePin, 12)
});

console.log(`Admin seeded: ${env.adminEmail}`);
process.exit(0);
