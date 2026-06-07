import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { config } from './config/env';
import { PrismaSessionStore } from './config/sessionStore';
import { errorHandler } from './middleware/error.middleware';
import authRouter from './modules/auth/auth.routes';

const app = express();

app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
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
  }),
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);

// Module routers mounted in Steps 6–9:
// app.use('/api/users', usersRouter);
// app.use('/api/rooms', roomsRouter);
// app.use('/api/invitations', invitationsRouter);
// app.use('/api', messagesRouter);

app.use(errorHandler);

export default app;
