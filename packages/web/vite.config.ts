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
        passes: 3, // Multiple passes for better compression
        unsafe: true, // Enable unsafe optimizations
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_methods: true,
        unsafe_proto: true,
        unsafe_regexp: true,
        unsafe_undefined: true,
        dead_code: true,
        unused: true,
        collapse_vars: true,
        reduce_vars: true,
        inline: 2, // Inline functions
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
              
              // Split by package name more aggressively to prevent huge chunks
              // Use first 4-5 characters for better distribution
              const prefix = packageName.substring(0, Math.min(5, packageName.length)).toLowerCase()
              
              // For very common prefixes that create large chunks, use more characters
              const largePrefixes = ['el', 'ex', 'en', 'es']
              if (largePrefixes.includes(prefix.substring(0, 2))) {
                // Use first 6 characters for these to split further
                const extendedPrefix = packageName.substring(0, Math.min(6, packageName.length)).toLowerCase()
                return `vendor-${extendedPrefix}`
              }
              
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
    chunkSizeWarningLimit: 1500, // Increased for large dependencies like mermaid/elkjs
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
