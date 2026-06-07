import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';

const MESSAGE_SELECT = {
  id: true,
  content: true,
  type: true,
  createdAt: true,
  sender: { select: { id: true, name: true, avatar: true } },
} as const;

export async function getRoomMessages(
  roomId: string,
  userId: string,
  cursor: string | undefined,
  limit: number,
) {
  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) throw new AppError(404, 'Room not found');

  const wasParticipant = await prisma.participant.findFirst({
    where: { roomId, userId },
    select: { id: true },
  });
  if (!wasParticipant) throw new AppError(403, 'Access denied');

  const messages = await prisma.message.findMany({
    where: { roomId },
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: MESSAGE_SELECT,
  });

  const nextCursor = messages.length === limit ? messages[messages.length - 1].id : null;

  return { messages, nextCursor };
}

export async function deleteMessage(messageId: string, userId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { id: true, senderId: true },
  });
  if (!message) throw new AppError(404, 'Message not found');
  if (message.senderId !== userId) throw new AppError(403, 'You can only delete your own messages');

  await prisma.message.delete({ where: { id: messageId } });
}

export async function saveMessage(
  roomId: string,
  senderId: string,
  content: string,
  type: 'text' | 'file' = 'text',
) {
  return prisma.message.create({
    data: { roomId, senderId, content, type },
    select: MESSAGE_SELECT,
  });
}
