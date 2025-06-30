import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    port: 3001, // Use a different port for the ECS version
    open: './ecs-index.html', // Explicitly open the ECS HTML file
  },
  build: {
    outDir: 'dist-ecs',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'ecs-index.html')
      }
    }
  },
  base: './',
});
