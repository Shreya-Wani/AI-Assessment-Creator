import { Router } from 'express';
import multer from 'multer';
import { protect, authorizeRoles, Role } from '../../middleware/authMiddleware';
import * as ctrl from './assignment.controller';

const router = Router();

// Multer for handling optional file uploads
const upload = multer({ dest: 'uploads/' });

// ── TEACHER ONLY ──────────────────────────────────────────────────────
router.post('/', protect, authorizeRoles(Role.TEACHER), upload.single('file'), ctrl.createAssignment);
router.delete('/:id', protect, authorizeRoles(Role.TEACHER), ctrl.deleteAssignment);
router.post('/:id/regenerate', protect, authorizeRoles(Role.TEACHER), ctrl.regenerateAssignment);

router.get('/', protect, authorizeRoles(Role.TEACHER), ctrl.getAssignments);
router.get('/:id', protect, authorizeRoles(Role.TEACHER), ctrl.getAssignmentById);
router.get('/:id/status', protect, authorizeRoles(Role.TEACHER), ctrl.getAssignmentStatus);
router.get('/:id/pdf', protect, authorizeRoles(Role.TEACHER), ctrl.downloadAssignmentPdf);

export default router;
