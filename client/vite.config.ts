/// <reference types="node" />
/// <reference types="vite/client" />

import path from "path";
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    // the dockerized backend's Chrome loads /r/:token?print=1 from here via host.docker.internal
    allowedHosts: ['host.docker.internal']
  },
  test: {
    environment: 'node'
  }
});
