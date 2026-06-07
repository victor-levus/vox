import session from 'express-session';
import { config } from './env';
import { PrismaSessionStore } from './sessionStore';

export const sessionMiddleware = session({
  store: new PrismaSessionStore(),
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'connect.sid',
  cookie: {
    httpOnly: true,
    secure: config.SESSION_COOKIE_SECURE,
    sameSite: config.SESSION_COOKIE_SAME_SITE,
    maxAge: config.SESSION_MAX_AGE_MS,
  },
});
