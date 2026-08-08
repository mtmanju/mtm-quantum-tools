import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

// https://vite.dev/config/
/**
 * Drop the <meta> CSP during `vite dev` only.
 *
 * The policy in index.html hashes exactly one inline script — the `js`-class
 * one-liner. In dev, @vitejs/plugin-react also injects an inline React Refresh
 * preamble, which that hash does not cover, so the browser blocks it and Fast
 * Refresh silently stops working. Loosening the policy to accommodate a script
 * that never ships would weaken the thing production actually relies on, so
 * the meta tag is simply not served in dev.
 *
 * Production is unaffected: the built index.html keeps the meta tag, and the
 * real headers in vercel.json / public/_headers are the primary enforcement
 * either way.
 */
const stripCspInDev = (): Plugin => ({
  name: 'strip-csp-in-dev',
  apply: 'serve',
  transformIndexHtml: html =>
    html.replace(/<meta http-equiv="Content-Security-Policy"[\s\S]*?\/>\s*/i, ''),
})

export default defineConfig({
  plugins: [react(), stripCspInDev()],
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
        // NO manualChunks.
        //
        // A hand-rolled manualChunks() used to group vendors by the first 3
        // characters of the package name. That swept Vite's __vitePreload
        // helper into the `mermaid-vendor` chunk, which made the entry chunk
        // *statically* depend on mermaid — and therefore on elkjs (1.5 MB),
        // cytoscape (428 KB), d3, dagre and katex. Every route, including the
        // homepage, downloaded ~989 KB gzipped of a diagram engine that only
        // MarkdownConverter uses.
        //
        // Rollup's default splitting already respects the dynamic import
        // boundaries created by React.lazy(), which is exactly what we want:
        // each tool gets its own chunk and heavy deps land in the chunk of the
        // tool that imports them. First load is ~92 KB gzipped across 2 files.
        // Do not reintroduce manualChunks without measuring the entry graph.
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
    // mermaid is deliberately absent: it is only reachable through a dynamic
    // import inside MarkdownConverter, and pre-bundling it slows cold dev start
    // for every other tool.
    include: ['react', 'react-dom', 'lucide-react'],
  },
  // esbuild options only apply when using esbuild minifier
  // Since we're using terser, these are not needed
})
