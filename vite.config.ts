
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Fixes the "Adjust chunk size limit" warning
    chunkSizeWarningLimit: 1600,
    outDir: 'dist',
  },
  define: {
    // Safely define process.env for the browser to prevent "process is not defined" crashes
    'process.env': {}
  }
});
