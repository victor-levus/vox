import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type { CreateRoomInput } from './rooms.schema';

const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const ROOM_CODE_LENGTH = 10;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return code;
}

async function uniqueCode(): Promise<string> {
  let code = generateCode();
  while (await prisma.room.findUnique({ where: { code } })) {
    code = generateCode();
  }
  return code;
}

const ROOM_SELECT = {
  id: true,
  code: true,
  name: true,
  hostId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  host: { select: { id: true, name: true, avatar: true } },
} as const;

export async function createRoom(userId: string, data: CreateRoomInput) {
  const code = await uniqueCode();
  return prisma.room.create({
    data: { code, name: data.name, hostId: userId },
    select: ROOM_SELECT,
  });
}

export async function getRoomByCode(code: string) {
  const room = await prisma.room.findUnique({ where: { code }, select: ROOM_SELECT });
  if (!room) throw new AppError(404, 'Room not found');
  return room;
}

export async function getMyRooms(userId: string) {
  return prisma.room.findMany({
    where: {
      OR: [
        { hostId: userId },
        { participants: { some: { userId } } },
      ],
    },
    select: {
      ...ROOM_SELECT,
      _count: { select: { participants: { where: { leftAt: null } } } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function endRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  if (!room) throw new AppError(404, 'Room not found');
  if (room.hostId !== userId) throw new AppError(403, 'Only the host can end the room');
  return prisma.room.delete({ where: { id: roomId }, select: ROOM_SELECT });
}
