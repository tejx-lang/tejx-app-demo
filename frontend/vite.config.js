import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = parseInt(env.VITE_PORT || '3000', 10);
  const backendUrl = env.VITE_BACKEND_URL || 'http://127.0.0.1:8080';

  return {
    plugins: [react()],
    server: {
      port: port,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true
        },
        '/health': {
          target: backendUrl,
          changeOrigin: true
        }
      }
    }
  };
});
