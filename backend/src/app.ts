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

app.use(helmet());
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
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
