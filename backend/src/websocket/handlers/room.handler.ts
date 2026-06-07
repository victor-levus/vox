import type { Server, Socket } from 'socket.io';
import prisma from '../../config/prisma';
import { SocketEvents } from '../events';

interface RoomMember {
  socketId: string;
  userId: string;
  name: string;
  avatar: string | null;
}

// roomCode → Map<socketId, RoomMember> (in-memory participant state)
const rooms = new Map<string, Map<string, RoomMember>>();
// socketId → roomCode (for fast disconnect cleanup)
const socketToRoom = new Map<string, string>();

export function getSocketMember(socketId: string): RoomMember | undefined {
  const roomCode = socketToRoom.get(socketId);
  if (!roomCode) return undefined;
  return rooms.get(roomCode)?.get(socketId);
}

function getMembers(roomCode: string): RoomMember[] {
  return Array.from(rooms.get(roomCode)?.values() ?? []);
}

export function registerRoomHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  async function leaveRoom(): Promise<void> {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const roomMembers = rooms.get(roomCode);
    if (roomMembers) {
      roomMembers.delete(socket.id);
      if (roomMembers.size === 0) rooms.delete(roomCode);
    }
    socketToRoom.delete(socket.id);

    socket.to(roomCode).emit(SocketEvents.USER_LEFT, { socketId: socket.id, userId });
    await socket.leave(roomCode);

    const room = await prisma.room.findUnique({ where: { code: roomCode }, select: { id: true } });
    if (room) {
      await prisma.participant.updateMany({
        where: { userId, roomId: room.id, leftAt: null },
        data: { leftAt: new Date() },
      });
    }
  }

  socket.on(SocketEvents.JOIN_ROOM, async ({ roomCode }: { roomCode: string }) => {
    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      select: { id: true, hostId: true },
    });
    if (!room) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, avatar: true },
    });
    if (!user) return;

    const existing = await prisma.participant.findFirst({
      where: { userId, roomId: room.id, leftAt: null },
      select: { id: true },
    });
    if (!existing) {
      await prisma.participant.create({
        data: { userId, roomId: room.id, role: room.hostId === userId ? 'host' : 'guest' },
      });
    }

    if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
    const roomMembers = rooms.get(roomCode)!;
    const member: RoomMember = { socketId: socket.id, userId, name: user.name, avatar: user.avatar };
    roomMembers.set(socket.id, member);
    socketToRoom.set(socket.id, roomCode);

    await socket.join(roomCode);

    // Send existing participants to the joiner (exclude self — joiner initiates WebRTC offers to these)
    const others = getMembers(roomCode).filter((m) => m.socketId !== socket.id);
    socket.emit(SocketEvents.PARTICIPANT_LIST, { participants: others });

    // Notify everyone else of the new joiner
    socket.to(roomCode).emit(SocketEvents.USER_JOINED, member);
  });

  socket.on(SocketEvents.LEAVE_ROOM, async () => {
    await leaveRoom();
  });

  socket.on('disconnect', async () => {
    await leaveRoom();
  });
}
