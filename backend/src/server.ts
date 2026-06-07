// Implemented in Step 4
import http from 'http';
import app from './app';

const PORT = process.env.PORT ?? 4000;
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
