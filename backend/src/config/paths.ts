import fs from 'fs';
import path from 'path';

// Works in both ts-node (src/) and compiled (dist/) runtime layouts.
export const BACKEND_ROOT = path.resolve(__dirname, '../..');
export const UPLOADS_DIR = path.resolve(BACKEND_ROOT, 'uploads');

export const ensureUploadsDir = (): void => {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
};
