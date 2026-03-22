import express from 'express';
import multer from 'multer';
import path from 'path';
import {
  getFiles,
  addFile,
  deleteFile,
  updateFile,
  getFolders,
  createFolder,
  uploadFile,
  downloadFile,
  previewFile,
} from '../controllers/libraryController';
import { protect, authorizeRoles, Role } from '../middleware/authMiddleware';
import { UPLOADS_DIR } from '../config/paths';

const router = express.Router();
const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '';
    cb(null, `library-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage });

router.route('/')
  .get(protect, getFiles)
  .post(protect, authorizeRoles(Role.TEACHER), addFile);

router.route('/folders')
  .get(protect, getFolders)
  .post(protect, authorizeRoles(Role.TEACHER), createFolder);

router.post('/upload', protect, authorizeRoles(Role.TEACHER), upload.single('file'), uploadFile);
router.get('/:id/download', protect, downloadFile);
router.get('/:id/preview', protect, previewFile);

router.route('/:id')
  .put(protect, authorizeRoles(Role.TEACHER), updateFile)
  .delete(protect, authorizeRoles(Role.TEACHER), deleteFile);

export default router;
