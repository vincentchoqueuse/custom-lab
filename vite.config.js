import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Relative base: the build is deployable from any static host path (Netlify, subdir…).
  base: './',
  build: {
    // generous syntax floor for classroom tablets (older iPad Safari)
    target: ['es2018', 'safari13'],
  },
  worker: {
    // Classic (iife) worker: module workers require Safari 15+, too recent
    // for classroom tablets. The compute glob's dynamic imports are inlined
    // into the single worker bundle.
    format: 'iife',
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
