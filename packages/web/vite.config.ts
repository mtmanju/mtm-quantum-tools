import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssMinify: true,
    sourcemap: false,
    rollupOptions: {
      external: ['d3-sankey'],
      output: {
        manualChunks: (id) => {
          // React and core dependencies
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor'
          }
          
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'router-vendor'
          }
          
          // UI libraries - split lucide-react to load on demand
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor'
          }
          
          if (id.includes('node_modules/react-dropzone')) {
            return 'ui-vendor'
          }
          
          // Document processing - only load when needed
          if (id.includes('node_modules/docx') || id.includes('node_modules/file-saver')) {
            return 'docx-vendor'
          }
          
          // Mermaid - huge library, load only when MarkdownConverter is used
          if (id.includes('node_modules/mermaid')) {
            return 'mermaid-vendor'
          }
          
          // Split other large dependencies
          if (id.includes('node_modules')) {
            // Keep small utilities together
            return 'vendor'
          }
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: true,
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: ['mermaid']
  },
  esbuild: {
    treeShaking: true,
    legalComments: 'none',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true
  }
})
