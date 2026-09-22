import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.CALM_GEMINI_KEY': JSON.stringify(env.CALM_GEMINI_KEY),
    },
    optimizeDeps: {
      include: [
        'react', 
        'react-dom', 
        'react-router-dom', 
        'lucide-react', 
        'framer-motion',
        'axios'
      ],
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        usePolling: false,
        ignored: ['**/node_modules/**', '**/dist/**']
      }
    },
    build: {
      target: 'esnext',
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
  };
});
