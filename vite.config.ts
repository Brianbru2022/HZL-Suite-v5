import path from 'path';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // loadEnv keeps local developer config available for tooling, but AI keys are no longer injected into the frontend bundle.
    loadEnv(mode, '.', '');
    return {
      root: '.',
      base: './',
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          output: {
            manualChunks(id) {
              const normalizedId = id.replace(/\\/g, '/');

              if (normalizedId.includes('vite/preload-helper')) {
                return 'app-runtime';
              }

              if (normalizedId.includes('node_modules')) {
                if (
                  normalizedId.includes('/core-js/') ||
                  normalizedId.includes('/regenerator-runtime/')
                ) {
                  return 'excel-polyfill-vendor';
                }

                if (
                  normalizedId.includes('/jszip/') ||
                  normalizedId.includes('/pako/') ||
                  normalizedId.includes('/lie/') ||
                  normalizedId.includes('/setimmediate/')
                ) {
                  return 'excel-zip-vendor';
                }

                if (
                  normalizedId.includes('/archiver/') ||
                  normalizedId.includes('/archiver-utils/') ||
                  normalizedId.includes('/compress-commons/') ||
                  normalizedId.includes('/zip-stream/') ||
                  normalizedId.includes('/crc-32/') ||
                  normalizedId.includes('/crc32-stream/') ||
                  normalizedId.includes('/buffer-crc32/')
                ) {
                  return 'excel-archive-vendor';
                }

                if (
                  normalizedId.includes('/fast-csv/') ||
                  normalizedId.includes('/@fast-csv/')
                ) {
                  return 'excel-csv-vendor';
                }

                if (
                  normalizedId.includes('/saxes/') ||
                  normalizedId.includes('/xmlchars/')
                ) {
                  return 'excel-xml-vendor';
                }

                if (
                  normalizedId.includes('/readable-stream/') ||
                  normalizedId.includes('/string_decoder/') ||
                  normalizedId.includes('/safe-buffer/') ||
                  normalizedId.includes('/core-util-is/') ||
                  normalizedId.includes('/inherits/') ||
                  normalizedId.includes('/isarray/') ||
                  normalizedId.includes('/process-nextick-args/') ||
                  normalizedId.includes('/util-deprecate/') ||
                  normalizedId.includes('/duplexer2/') ||
                  normalizedId.includes('/lazystream/') ||
                  normalizedId.includes('/buffer-indexof-polyfill/')
                ) {
                  return 'excel-stream-vendor';
                }

                if (
                  normalizedId.includes('/exceljs/')
                ) {
                  return 'excel-vendor';
                }

                if (
                  normalizedId.includes('/jspdf') ||
                  normalizedId.includes('/jspdf-autotable')
                ) {
                  return 'pdf-vendor';
                }

                if (normalizedId.includes('/html2canvas')) {
                  return 'capture-vendor';
                }

                if (
                  normalizedId.includes('/react/') ||
                  normalizedId.includes('/react-dom/') ||
                  normalizedId.includes('/scheduler/')
                ) {
                  return 'react-vendor';
                }

                if (
                  normalizedId.includes('/@tauri-apps/') ||
                  normalizedId.includes('/@tanstack/')
                ) {
                  return 'desktop-vendor';
                }

                if (normalizedId.includes('/lucide-react/')) {
                  return 'ui-vendor';
                }

                if (normalizedId.includes('/dompurify/')) {
                  return 'sanitizer-vendor';
                }
              }
            },
          },
        },
      },
      server: {
        port: 1420,
        strictPort: true,
        host: '127.0.0.1',
        hmr: {
          host: '127.0.0.1',
        },
      },
      clearScreen: false,
      plugins: [react()],
      test: {
        exclude: [
          'node_modules/**',
          'dist/**',
          'e2e/**',
          'test-results/**',
          'playwright-report/**',
          '.git/**',
        ],
      },
      resolve: {
        alias: {
          exceljs: path.resolve(__dirname, 'node_modules/exceljs/dist/exceljs.min.js'),
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
