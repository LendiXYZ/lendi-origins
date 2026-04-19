import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { resolve } from 'path';

// Uncomment to enable HTTPS for local network testing (WebAuthn requires HTTPS on non-localhost)
// import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [
    nodePolyfills({
      include: ['stream', 'util', 'buffer', 'process', 'crypto', 'events'],
      globals: { process: true, Buffer: true, global: true },
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      // Redirect Node.js cofhejs to browser build (used internally by @reineira-os/sdk)
      'cofhejs/node': resolve(__dirname, '../../node_modules/cofhejs/dist/web.mjs'),
    },
  },
  optimizeDeps: {
    exclude: ['tfhe', 'node-tfhe'],
  },
  define: {
    global: 'globalThis',
  },
  worker: {
    format: 'es',
  },
  server: {
    port: 4831,
    host: true,
    allowedHosts: ['e157-190-110-59-142.ngrok-free.app'],
    // https: true, // uncomment after: pnpm add -D @vitejs/plugin-basic-ssl
    proxy: {
      '/api': {
        target: 'https://lendi-origins.vercel.app',
        changeOrigin: true,
        secure: true,
      },
    },
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      // COEP disabled in dev — breaks cross-origin WebAuthn (passkey server).
      // Enable only when testing FHE/CoFHE features that require SharedArrayBuffer.
      // 'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
});
