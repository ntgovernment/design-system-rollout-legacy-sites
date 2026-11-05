import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5180,
    open: false
  },
  build: {
    rollupOptions: {
      output: {
        // stable, unhashed names -- consistent with the main website/ project
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js'
      }
    }
  }
});
