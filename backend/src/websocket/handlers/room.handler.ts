import type { Server, Socket } from 'socket.io';
import prisma from '../../config/prisma';
import { SocketEvents } from '../events';

interface RoomMember {
  socketId: string;
  userId: string;
  name: string;
  avatar: string | null;
  role: 'host' | 'guest';
}

// roomCode → Map<socketId, RoomMember>
const rooms = new Map<string, Map<string, RoomMember>>();
// socketId → roomCode (for fast disconnect cleanup)
const socketToRoom = new Map<string, string>();
// roomCode → current hostUserId (updated on transfer-host)
const roomHostUserIds = new Map<string, string>();

export function getSocketMember(socketId: string): RoomMember | undefined {
  const roomCode = socketToRoom.get(socketId);
  if (!roomCode) return undefined;
  return rooms.get(roomCode)?.get(socketId);
}

function getMembers(roomCode: string): RoomMember[] {
  return Array.from(rooms.get(roomCode)?.values() ?? []);
}

function findSocketIdByUserId(roomCode: string, targetUserId: string): string | undefined {
  const roomMembers = rooms.get(roomCode);
  if (!roomMembers) return undefined;
  for (const [socketId, member] of roomMembers) {
    if (member.userId === targetUserId) return socketId;
  }
  return undefined;
}

export function registerRoomHandlers(io: Server, socket: Socket): void {
  const userId = socket.data.userId as string;

  async function leaveRoom(): Promise<void> {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;

    const roomMembers = rooms.get(roomCode);
    if (roomMembers) {
      roomMembers.delete(socket.id);
      if (roomMembers.size === 0) {
        rooms.delete(roomCode);
        roomHostUserIds.delete(roomCode);
      }
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

    const role: 'host' | 'guest' = room.hostId === userId ? 'host' : 'guest';
    if (!rooms.has(roomCode)) rooms.set(roomCode, new Map());
    const roomMembers = rooms.get(roomCode)!;
    const member: RoomMember = { socketId: socket.id, userId, name: user.name, avatar: user.avatar, role };
    roomMembers.set(socket.id, member);
    socketToRoom.set(socket.id, roomCode);

    // Seed host map from DB on first join; transfer-host updates it later
    if (!roomHostUserIds.has(roomCode)) {
      roomHostUserIds.set(roomCode, room.hostId);
    }

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

  // --- Raise hand ---

  socket.on(SocketEvents.RAISE_HAND, () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    io.to(roomCode).emit(SocketEvents.HAND_RAISED, { userId });
  });

  socket.on(SocketEvents.LOWER_HAND, () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    io.to(roomCode).emit(SocketEvents.HAND_LOWERED, { userId });
  });

  socket.on(
    SocketEvents.MEDIA_STATE_CHANGED,
    (payload: { isAudioEnabled?: boolean; isVideoEnabled?: boolean }) => {
      const roomCode = socketToRoom.get(socket.id);
      if (!roomCode) return;
      io.to(roomCode).emit(SocketEvents.PARTICIPANT_STATE_UPDATED, { userId, ...payload });
    },
  );

  socket.on(SocketEvents.REACTION, ({ emoji }: { emoji: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    io.to(roomCode).emit(SocketEvents.REACTION, { emoji, userId });
  });

  socket.on(SocketEvents.SCREEN_SHARE_STARTED, () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    io.to(roomCode).emit(SocketEvents.PARTICIPANT_STATE_UPDATED, { userId, isScreenSharing: true });
  });

  socket.on(SocketEvents.SCREEN_SHARE_STOPPED, () => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    io.to(roomCode).emit(SocketEvents.PARTICIPANT_STATE_UPDATED, { userId, isScreenSharing: false });
  });

  // --- Host controls ---

  socket.on(SocketEvents.MUTE_PARTICIPANT, ({ targetUserId }: { targetUserId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    if (roomHostUserIds.get(roomCode) !== userId) return;

    const targetSocketId = findSocketIdByUserId(roomCode, targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit(SocketEvents.YOU_WERE_MUTED);
    io.to(roomCode).emit(SocketEvents.PARTICIPANT_STATE_UPDATED, { userId: targetUserId, isAudioEnabled: false });
  });

  socket.on(SocketEvents.UNMUTE_PARTICIPANT, ({ targetUserId }: { targetUserId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    if (roomHostUserIds.get(roomCode) !== userId) return;

    const targetSocketId = findSocketIdByUserId(roomCode, targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit(SocketEvents.YOU_WERE_UNMUTED);
    io.to(roomCode).emit(SocketEvents.PARTICIPANT_STATE_UPDATED, { userId: targetUserId, isAudioEnabled: true });
  });

  socket.on(SocketEvents.DISABLE_PARTICIPANT_VIDEO, ({ targetUserId }: { targetUserId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    if (roomHostUserIds.get(roomCode) !== userId) return;

    const targetSocketId = findSocketIdByUserId(roomCode, targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit(SocketEvents.YOUR_VIDEO_WAS_DISABLED);
    io.to(roomCode).emit(SocketEvents.PARTICIPANT_STATE_UPDATED, { userId: targetUserId, isVideoEnabled: false });
  });

  socket.on(SocketEvents.ENABLE_PARTICIPANT_VIDEO, ({ targetUserId }: { targetUserId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    if (roomHostUserIds.get(roomCode) !== userId) return;

    const targetSocketId = findSocketIdByUserId(roomCode, targetUserId);
    if (!targetSocketId) return;
    io.to(targetSocketId).emit(SocketEvents.YOUR_VIDEO_WAS_ENABLED);
    io.to(roomCode).emit(SocketEvents.PARTICIPANT_STATE_UPDATED, { userId: targetUserId, isVideoEnabled: true });
  });

  socket.on(SocketEvents.REMOVE_PARTICIPANT, ({ targetUserId }: { targetUserId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    if (roomHostUserIds.get(roomCode) !== userId) return;
    if (targetUserId === userId) return;

    const targetSocketId = findSocketIdByUserId(roomCode, targetUserId);
    if (!targetSocketId) return;

    // Notify the target; client handles navigation and calls disconnect
    io.to(targetSocketId).emit(SocketEvents.YOU_WERE_REMOVED);
  });

  socket.on(SocketEvents.TRANSFER_HOST, ({ targetUserId }: { targetUserId: string }) => {
    const roomCode = socketToRoom.get(socket.id);
    if (!roomCode) return;
    if (roomHostUserIds.get(roomCode) !== userId) return;

    const roomMembers = rooms.get(roomCode);
    if (!roomMembers) return;

    for (const member of roomMembers.values()) {
      if (member.userId === userId) member.role = 'guest';
      if (member.userId === targetUserId) member.role = 'host';
    }
    roomHostUserIds.set(roomCode, targetUserId);

    io.to(roomCode).emit(SocketEvents.HOST_CHANGED, { newHostUserId: targetUserId });
  });
}
