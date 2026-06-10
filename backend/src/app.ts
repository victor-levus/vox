import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { sessionMiddleware } from './config/session';
import { errorHandler } from './middleware/error.middleware';
import authRouter from './modules/auth/auth.routes';
import usersRouter from './modules/users/users.routes';
import roomsRouter from './modules/rooms/rooms.routes';
import invitationsRouter from './modules/invitations/invitations.routes';
import messagesRouter from './modules/messages/messages.routes';

const app = express();

// Trust the first reverse proxy (VPS nginx) so that:
// - SESSION_COOKIE_SECURE=true works (Express sees X-Forwarded-Proto: https)
// - express-rate-limit uses real client IP from X-Forwarded-For
// - req.ip shows the actual client address, not the proxy IP
app.set('trust proxy', 1);

app.use(helmet());
const allowedOrigins = config.CLIENT_URL.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) cb(null, true);
      else cb(new Error(`Origin ${origin} not allowed`));
    },
    credentials: true,
  }),
);
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json());
app.use(cookieParser());
app.use(sessionMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/rooms', roomsRouter);
app.use('/api/invitations', invitationsRouter);
app.use('/api', messagesRouter);

app.use(errorHandler);

export default app;
