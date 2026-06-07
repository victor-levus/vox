import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const socketService = {
  connect(): Socket {
    if (!socket) {
      socket = io(import.meta.env.VITE_SOCKET_URL ?? '', {
        withCredentials: true,
        transports: ['websocket', 'polling'],
      });
    }
    return socket;
  },

  disconnect() {
    socket?.disconnect();
    socket = null;
  },

  getSocket(): Socket | null {
    return socket;
  },
};
