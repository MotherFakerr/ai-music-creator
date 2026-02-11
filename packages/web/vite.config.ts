import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@ai-music-creator/core': `${__dirname}/../core/src`,
      '@ai-music-creator/audio': `${__dirname}/../audio/src`,
      '@ai-music-creator/ui': `${__dirname}/../ui/src`,
      '@ai-music-creator/midi': `${__dirname}/../midi/src`,
      '@ai-music-creator/ai': `${__dirname}/../ai/src`,
    },
  },
});
