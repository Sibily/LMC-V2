import { io, Socket } from 'socket.io-client';
import { getToken } from '../api/client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = getToken();
    socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function reconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  return getSocket();
}
