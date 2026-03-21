import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { registerUser, loginUser, getMe, updateMe } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();
const uploadDir = path.resolve(__dirname, '../../../uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
	destination: (_req, _file, cb) => {
		cb(null, uploadDir);
	},
	filename: (_req, file, cb) => {
		const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
		cb(null, `avatar-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
	},
});

const upload = multer({
	storage,
	fileFilter: (_req, file, cb) => {
		if (file.mimetype.startsWith('image/')) {
			cb(null, true);
			return;
		}
		cb(new Error('Only image files are allowed'));
	},
	limits: { fileSize: 5 * 1024 * 1024 },
});

router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/me', protect, upload.single('avatar'), updateMe);

export default router;
