import 'dotenv/config';
import http from 'http';
import app from './app';
import { config } from './config/env';
import { initSocket } from './websocket/socket';
import prisma from './config/prisma';

const server = http.createServer(app);

export const io = initSocket(server);

server.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
});

// Prune expired sessions every 30 minutes
setInterval(async () => {
  try {
    const { count } = await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    if (count > 0) console.log(`Pruned ${count} expired session(s)`);
  } catch (err) {
    console.error('Session pruning error:', err);
  }
}, 30 * 60 * 1000);
