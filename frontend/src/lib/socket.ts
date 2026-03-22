import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://ai-assessment-creator-25u7.onrender.com';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 WebSocket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 WebSocket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('🔌 WebSocket connection error:', error.message);
    });
  }

  return socket;
}

// ── Room Management (job-based) ───────────────────────────────────────
export function joinJob(jobId: string): void {
  const s = getSocket();
  s.emit('join:job', jobId);
}

export function leaveJob(jobId: string): void {
  const s = getSocket();
  s.emit('leave:job', jobId);
}

// Legacy aliases for backward compat
export const joinAssignment = joinJob;
export const leaveAssignment = leaveJob;

// ── Event Listeners (matching backend websocket.ts) ───────────────────
export function onProgress(
  callback: (data: { jobId: string; progress: number; status: string }) => void
): () => void {
  const s = getSocket();
  s.on('assignment:progress', callback);
  return () => { s.off('assignment:progress', callback); };
}

export function onCompleted(
  callback: (data: { assignmentId: string; result: unknown }) => void
): () => void {
  const s = getSocket();
  s.on('assignment:completed', callback);
  return () => { s.off('assignment:completed', callback); };
}

export function onError(
  callback: (data: { jobId: string; error: string }) => void
): () => void {
  const s = getSocket();
  s.on('assignment:error', callback);
  return () => { s.off('assignment:error', callback); };
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
