import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const uploadRoot = path.resolve(__dirname, '../../uploads');

export async function ensureUploadRoot() {
  await fs.mkdir(uploadRoot, { recursive: true });
}

export async function removeUploadFile(filePath) {
  if (!filePath) return;
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(uploadRoot)) {
    throw new Error('Refusing to remove file outside upload root.');
  }
  await fs.rm(resolved, { force: true });
}
