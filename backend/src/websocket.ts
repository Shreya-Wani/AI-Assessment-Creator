import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { config } from './config';
import logger from './utils/logger';

let io: SocketIOServer | null = null;
const jobRooms = new Map<string, Set<string>>();

export function initWebSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: [config.frontendUrl, 'http://localhost:3000'], methods: ['GET', 'POST'], credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.on('connection', (socket: Socket) => {
    logger.info({ socketId: socket.id }, '[WS] Client connected');

    socket.on('join:job', (jobId: string) => {
      socket.join(`job:${jobId}`);
      logger.info({ socketId: socket.id, jobId }, '[WS] Client joined job room');

      if (!jobRooms.has(jobId)) jobRooms.set(jobId, new Set());
      jobRooms.get(jobId)?.add(socket.id);
    });

    socket.on('leave:job', (jobId: string) => {
      socket.leave(`job:${jobId}`);
      jobRooms.get(jobId)?.delete(socket.id);
      if (jobRooms.get(jobId)?.size === 0) jobRooms.delete(jobId);
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, '[WS] Client disconnected');
      for (const [jobId, sockets] of jobRooms) {
        sockets.delete(socket.id);
        if (sockets.size === 0) jobRooms.delete(jobId);
      }
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

export function getIO(): SocketIOServer {
  if (!io) throw new Error('WebSocket not initialized');
  return io;
}

export function emitProgress(jobId: string, progress: number, status: string): void {
  if (io) {
    logger.info({ jobId, progress, status }, '[WS] Emitting progress');
    io.to(`job:${jobId}`).emit('assignment:progress', { jobId, progress, status });
  }
}

export function emitCompleted(jobId: string, assignmentId: string, result: object, title?: string): void {
  if (io) {
    logger.info({ jobId, assignmentId }, '[WS] Emitting completed');
    io.to(`job:${jobId}`).emit('assignment:completed', { assignmentId, result, title });
  }
}

export function emitError(jobId: string, error: string): void {
  if (io) {
    logger.info({ jobId, error }, '[WS] Emitting error');
    io.to(`job:${jobId}`).emit('assignment:error', { jobId, error });
  }
}
