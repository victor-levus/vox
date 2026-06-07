import 'dotenv/config';
import http from 'http';
import { Server as SocketServer } from 'socket.io';
import app from './app';
import { config } from './config/env';

const server = http.createServer(app);

export const io = new SocketServer(server, {
  cors: { origin: config.CLIENT_URL, credentials: true },
});

// Socket.io handlers registered in Step 10:
// initSocket(io);

server.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
});
