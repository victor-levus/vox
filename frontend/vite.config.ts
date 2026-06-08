import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createLogger, defineConfig } from 'vite';

const logger = createLogger();
const originalWarn = logger.warn.bind(logger);
const originalError = logger.error.bind(logger);
logger.warn = (msg, opts) => {
  if (msg.includes('ECONNABORTED')) return;
  originalWarn(msg, opts);
};
logger.error = (msg, opts) => {
  if (msg.includes('ECONNABORTED')) return;
  originalError(msg, opts);
};

export default defineConfig({
  customLogger: logger,
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    allowedHosts: ['ample-giant-guacamole.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
