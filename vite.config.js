import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import legacy from '@vitejs/plugin-legacy';
import { subjectFilter } from './scripts/subject-filter.js';

export default defineConfig({
  plugins: [
    // EXPE34_SUBJECT=control npm run build → a single-subject deployment.
    // Must come BEFORE svelte(): it rewrites the glob patterns, which Vite
    // then resolves.
    subjectFilter(),
    svelte(),
    // Single legacy build (SystemJS + classic scripts + core-js polyfills):
    // classroom tablets run old iPad Safari, where ES-module loading proved
    // fragile in ways that fail silently. No modern/dual build — one
    // bulletproof path for everyone; dev mode is unaffected.
    legacy({
      targets: ['defaults', 'ios_saf >= 11', 'safari >= 11'],
      renderModernChunks: false,
    }),
  ],
  // Relative base: the build is deployable from any static host path (Netlify, subdir…).
  base: './',
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
