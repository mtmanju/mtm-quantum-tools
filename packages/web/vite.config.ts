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
    minify: 'terser', // Use terser for better minification
    cssMinify: true,
    sourcemap: false,
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.log in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn'],
        passes: 1, // Reduced passes to prevent build hangs
        unsafe: false, // Disable unsafe optimizations for stability
        dead_code: true,
        unused: true,
        collapse_vars: true,
        reduce_vars: true,
        inline: 1, // Reduced inlining
        keep_fargs: false, // Remove unused function arguments
      },
      format: {
        comments: false, // Remove all comments
        ecma: 2020, // Use modern ECMAScript
        safari10: true, // Fix Safari 10 issues
      },
      mangle: {
        safari10: true,
        properties: false, // Don't mangle properties to avoid breaking code
      },
    },
    rollupOptions: {
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
          
          // Split vendor libraries more aggressively to avoid huge chunks
          if (id.includes('node_modules')) {
            const match = id.match(/node_modules\/(@?[^/]+)/)
            if (match) {
              const packageName = match[1]
              
              // Split scoped packages by full name
              if (packageName.startsWith('@')) {
                const fullName = packageName.replace('@', '').replace('/', '-')
                return `vendor-${fullName.substring(0, 15)}`
              }
              
              // Large utility libraries get their own chunk
              const largePackages = ['lodash', 'moment', 'date-fns', 'axios', 'uuid', 'express', 'body-parser', 'elkjs', 'elk', 'cytoscape']
              if (largePackages.some(pkg => packageName.includes(pkg))) {
                return `vendor-${packageName}`
              }
              
              // Very large packages that need their own chunk
              if (packageName.includes('cytoscape') || packageName.includes('elk')) {
                return `vendor-${packageName.substring(0, 8)}`
              }
              
              // Simplified chunking - group by first 3 characters to reduce chunk count
              const prefix = packageName.substring(0, Math.min(3, packageName.length)).toLowerCase()
              return `vendor-${prefix}`
            }
            // Fallback for any unmatched packages
            return 'vendor-misc'
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
    chunkSizeWarningLimit: 2000, // Increased to reduce warnings
    reportCompressedSize: true,
    cssCodeSplit: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react'],
    exclude: ['mermaid']
  },
  // esbuild options only apply when using esbuild minifier
  // Since we're using terser, these are not needed
})
