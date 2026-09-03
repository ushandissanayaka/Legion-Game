import { io, Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '../types/game';
import type { PlayerState, RoomState } from '../types/game';

// ============================================================
// Socket.IO client singleton
// ============================================================

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

let _socket: Socket | null = null;

export function getSocket(): Socket {
  if (!_socket) {
    _socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return _socket;
}

export function connectSocket(): Socket {
  const socket = getSocket();
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
}

export function disconnectSocket(): void {
  if (_socket?.connected) {
    _socket.disconnect();
  }
}

export { SOCKET_EVENTS };
