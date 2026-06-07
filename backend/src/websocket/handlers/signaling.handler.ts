import type { Server, Socket } from 'socket.io';
import { SocketEvents } from '../events';

export function registerSignalingHandlers(io: Server, socket: Socket): void {
  socket.on(
    SocketEvents.OFFER,
    ({ sdp, targetSocketId }: { sdp: unknown; targetSocketId: string }) => {
      io.to(targetSocketId).emit(SocketEvents.OFFER, { sdp, fromSocketId: socket.id });
    },
  );

  socket.on(
    SocketEvents.ANSWER,
    ({ sdp, targetSocketId }: { sdp: unknown; targetSocketId: string }) => {
      io.to(targetSocketId).emit(SocketEvents.ANSWER, { sdp, fromSocketId: socket.id });
    },
  );

  socket.on(
    SocketEvents.ICE_CANDIDATE,
    ({ candidate, targetSocketId }: { candidate: unknown; targetSocketId: string }) => {
      io.to(targetSocketId).emit(SocketEvents.ICE_CANDIDATE, { candidate, fromSocketId: socket.id });
    },
  );
}
