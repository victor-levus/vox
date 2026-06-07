import { Store, type SessionData } from 'express-session';
import prisma from './prisma';

const DEFAULT_TTL_MS = 86400000; // 24h fallback

function getExpiry(session: SessionData): Date {
  if (session.cookie.expires) return new Date(session.cookie.expires);
  return new Date(Date.now() + (session.cookie.maxAge ?? DEFAULT_TTL_MS));
}

export class PrismaSessionStore extends Store {
  get(sid: string, callback: (err: unknown, session?: SessionData | null) => void): void {
    prisma.session
      .findUnique({ where: { id: sid } })
      .then((row) => {
        if (!row || row.expiresAt < new Date()) return callback(null, null);
        callback(null, row.data as unknown as SessionData);
      })
      .catch((err) => callback(err));
  }

  set(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    const expiresAt = getExpiry(session);
    const userId = session.userId ?? null;

    prisma.session
      .upsert({
        where: { id: sid },
        update: { data: session as object, expiresAt, userId },
        create: { id: sid, data: session as object, expiresAt, userId },
      })
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  destroy(sid: string, callback?: (err?: unknown) => void): void {
    prisma.session
      .deleteMany({ where: { id: sid } })
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }

  touch(sid: string, session: SessionData, callback?: (err?: unknown) => void): void {
    prisma.session
      .updateMany({ where: { id: sid }, data: { expiresAt: getExpiry(session) } })
      .then(() => callback?.())
      .catch((err) => callback?.(err));
  }
}
