import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // This line ensures the app runs on localhost:3000 by default
    port: 3000, 
  }
});