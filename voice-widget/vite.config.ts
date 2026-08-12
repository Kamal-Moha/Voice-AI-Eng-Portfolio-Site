import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The widget ships as a single self-contained "island": one JS file + one CSS
// file with stable (unhashed) names, dropped straight into the static site at
// website/public/voice-widget/. The host index.html references them with the
// site's usual ?v= cache-busting convention.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../website/public/voice-widget',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false, // emit a single CSS file for the host page to <link>
    rollupOptions: {
      input: 'src/main.tsx',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'voice-widget.js',
        assetFileNames: 'voice-widget.[ext]',
      },
    },
  },
});
