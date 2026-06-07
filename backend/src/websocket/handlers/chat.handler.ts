import type { Server, Socket } from 'socket.io';
import prisma from '../../config/prisma';
import { SocketEvents } from '../events';
import { getSocketMember } from './room.handler';
import { saveMessage } from '../../modules/messages/messages.service';

export function registerChatHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  socket.on(
    SocketEvents.SEND_MESSAGE,
    async ({ content, type = 'text' }: { content: string; type?: 'text' | 'file' }) => {
      if (!content?.trim()) return;

      const roomCode = Array.from(socket.rooms).find(r => r !== socket.id);
      if (!roomCode) return;

      const room = await prisma.room.findUnique({ where: { code: roomCode }, select: { id: true } });
      if (!room) return;

      const message = await saveMessage(room.id, userId, content.trim(), type);
      io.to(roomCode).emit(SocketEvents.NEW_MESSAGE, message);
    },
  );

  socket.on(SocketEvents.TYPING, () => {
    const member = getSocketMember(socket.id);
    if (!member) return;
    const roomCode = Array.from(socket.rooms).find(r => r !== socket.id);
    if (!roomCode) return;
    socket.to(roomCode).emit(SocketEvents.USER_TYPING, { userId, name: member.name });
  });

  socket.on(SocketEvents.STOP_TYPING, () => {
    const roomCode = Array.from(socket.rooms).find(r => r !== socket.id);
    if (!roomCode) return;
    socket.to(roomCode).emit(SocketEvents.USER_STOP_TYPING, { userId });
  });
}
