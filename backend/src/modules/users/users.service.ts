import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type { ChangePasswordInput, UpdateProfileInput } from './users.schema';

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SAFE_SELECT });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function updateProfile(userId: string, data: UpdateProfileInput) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: USER_SAFE_SELECT,
  });
}

export async function changePassword(userId: string, data: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const valid = await bcrypt.compare(data.currentPassword, user.password);
  if (!valid) throw new AppError(401, 'Current password is incorrect');

  const hashed = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
}

export async function searchUsers(query: string) {
  return prisma.user.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { email: { contains: query } },
      ],
    },
    select: USER_SAFE_SELECT,
    take: 10,
  });
}
