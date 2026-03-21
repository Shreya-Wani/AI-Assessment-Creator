// CRITICAL: Load environment variables FIRST before any other imports
import 'dotenv/config';

import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer } from 'http';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { initWebSocket } from './websocket';
import { startWorker } from './modules/queue/worker';
import { getRedisConnection } from './services/redisService';
import assignmentRoutes from './modules/assignment/assignment.routes';
import authRoutes from './routes/authRoutes';
import groupRoutes from './routes/groupRoutes';
import libraryRoutes from './routes/libraryRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import toolkitRoutes from './routes/toolkitRoutes';
import { getJobStatus } from './modules/assignment/assignment.controller';
import { protect } from './middleware/authMiddleware';
import { requestIdMiddleware } from './middleware/requestId';
import logger from './utils/logger';

const app = express();
const httpServer = createServer(app);

// If this app is behind a proxy (nginx, cloud load balancer), trust the proxy's X-Forwarded-* headers
// so rate limiting uses the real client IP instead of the proxy IP.
app.set('trust proxy', 1);

// ── Global Middleware ─────────────────────────────────────────────────

// Request ID (distributed tracing)
app.use(requestIdMiddleware);

// CORS
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Rate Limiting (abuse protection)
// - In production keep a stricter limit; during local development allow more requests to avoid 429s.
const isProd = process.env.NODE_ENV === 'production';
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProd ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate-limiting for local development hosts (localhost) to avoid accidental 429s when developing.
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || '';
    return ip === '::1' || ip === '127.0.0.1' || req.hostname?.includes('localhost');
  },
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files (for local dev). Files uploaded via multer are stored
// in the project `uploads/` folder and served at `/uploads/<filename>`.
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// Request logging
app.use((req, _res, next) => {
  logger.info({ requestId: req.requestId, method: req.method, url: req.url }, '[REQUEST]');
  next();
});

// ── Health Check ──────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/library', libraryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/toolkit', toolkitRoutes);

// Job Progress Fallback API (realtime + polling)
app.get('/api/jobs/:jobId', protect, getJobStatus);

// ── Error Handling ────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ requestId: req.requestId, error: err.message }, '[UNHANDLED ERROR]');
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

// ── Server Bootstrap ──────────────────────────────────────────────────
async function start() {
  try {
    await mongoose.connect(config.mongodbUri);
    logger.info('MongoDB connected');

    getRedisConnection();
    initWebSocket(httpServer);
    startWorker();

    httpServer.listen(config.port, () => {
      logger.info(`Server running on http://localhost:${config.port}`);
      logger.info('WebSocket ready');
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });
  } catch (error: any) {
    logger.fatal({ error: error.message }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await mongoose.disconnect();
  httpServer.close();
  process.exit(0);
});

start();

export default app;
