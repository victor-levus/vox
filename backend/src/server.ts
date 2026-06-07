import 'dotenv/config';
import http from 'http';
import app from './app';
import { config } from './config/env';
import { initSocket } from './websocket/socket';

const server = http.createServer(app);

export const io = initSocket(server);

server.listen(config.PORT, () => {
  console.log(`Server listening on port ${config.PORT} [${config.NODE_ENV}]`);
});
