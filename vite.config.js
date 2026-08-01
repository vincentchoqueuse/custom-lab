import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // Relative base: the build is deployable from any static host path (Netlify, subdir…).
  base: './',
  worker: {
    // The compute worker uses import.meta.glob dynamic imports — requires ES format.
    format: 'es',
  },
});
