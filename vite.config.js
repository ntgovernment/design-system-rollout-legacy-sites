import { defineConfig } from 'vite';

// Published asset location: dist/<channel>/<package>/<version>/
const CHANNEL = 'dev';
const PACKAGE = 'ntg';
const VERSION = '0.0.1';
const ASSET_DIR = `${CHANNEL}/${PACKAGE}/${VERSION}`;

export default defineConfig({
  base: './',
  server: {
    port: 5180,
    open: false
  },
  build: {
    outDir: 'dist',
    // keep sibling channels/versions (e.g. dist/main/) when rebuilding
    emptyOutDir: false,
    rollupOptions: {
      output: {
        // stable, unhashed names -- consistent with the main website/ project
        assetFileNames: `${ASSET_DIR}/[name][extname]`,
        entryFileNames: `${ASSET_DIR}/[name].js`,
        chunkFileNames: `${ASSET_DIR}/[name].js`
      }
    }
  }
});
