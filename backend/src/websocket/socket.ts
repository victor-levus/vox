import type http from 'http';
import type { Request, Response, NextFunction } from 'express';
import { Server } from 'socket.io';
import { config } from '../config/env';
import { sessionMiddleware } from '../config/session';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerSignalingHandlers } from './handlers/signaling.handler';
import { registerChatHandlers } from './handlers/chat.handler';

export function initSocket(httpServer: http.Server): Server {
  const io = new Server(httpServer, {
    cors: { origin: config.CLIENT_URL, credentials: true },
  });

  // Attach express-session to each socket handshake request
  io.use((socket, next) => {
    sessionMiddleware(
      socket.request as Request,
      {} as Response,
      next as NextFunction,
    );
  });

  // Reject unauthenticated connections
  io.use((socket, next) => {
    const session = (socket.request as Request).session;
    if (!session?.userId) return next(new Error('Unauthorized'));
    socket.data.userId = session.userId;
    next();
  });

  io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
    registerSignalingHandlers(io, socket);
    registerChatHandlers(io, socket);
  });

  return io;
}
