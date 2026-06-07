import bcrypt from 'bcryptjs';
import type { Session, SessionData } from 'express-session';
import prisma from '../../config/prisma';
import { AppError } from '../../middleware/error.middleware';
import type { LoginInput, RegisterInput } from './auth.schema';

const USER_SAFE_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function register(data: RegisterInput, session: Session & Partial<SessionData>) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new AppError(409, 'Email already in use');

  const hashed = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, password: hashed },
    select: USER_SAFE_SELECT,
  });

  session.userId = user.id;
  return user;
}

export async function login(data: LoginInput, session: Session & Partial<SessionData>) {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) throw new AppError(401, 'Invalid credentials');

  session.userId = user.id;
  const { password: _pw, ...safeUser } = user;
  return safeUser;
}

export async function logout(session: Session): Promise<void> {
  return new Promise((resolve, reject) => {
    session.destroy(err => {
      if (err) reject(new AppError(500, 'Logout failed'));
      else resolve();
    });
  });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SAFE_SELECT,
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}
