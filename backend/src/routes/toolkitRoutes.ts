import express from 'express';
import { protect, authorizeRoles, Role } from '../middleware/authMiddleware';
import { explainStudentAnswer } from '../controllers/toolkitController';

const router = express.Router();

router.post('/answer-helper', protect, authorizeRoles(Role.TEACHER), explainStudentAnswer);

export default router;
