#!/usr/bin/env node
/**
 * Generates robots.txt and sitemap.xml into dist/ after a build.
 *
 * Tool routes are read straight out of src/App.tsx so the sitemap can never
 * drift from the registry — adding a tool automatically adds its URL.
 *
 * Set SITE_URL at build time (e.g. SITE_URL=https://quantumtools.dev npm run build).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = join(__dirname, '..')
const dist = join(webRoot, 'dist')

if (!existsSync(dist)) {
  console.error('[seo] dist/ not found — run this after `vite build`.')
  process.exit(1)
}

const SITE_URL = (process.env.SITE_URL || 'https://quantum-tools.example').replace(/\/$/, '')

// Extract `id: 'x'` from the tools[] registry.
const appSrc = readFileSync(join(webRoot, 'src/App.tsx'), 'utf8')
const registryStart = appSrc.indexOf('const tools: Tool[] = [')
const registryEnd = appSrc.indexOf('\n]', registryStart)
const registry = appSrc.slice(registryStart, registryEnd)
const ids = [...registry.matchAll(/\bid:\s*'([a-z0-9-]+)'/g)].map(m => m[1])

if (!ids.length) {
  console.error('[seo] Could not parse any tool ids from App.tsx — refusing to write an empty sitemap.')
  process.exit(1)
}

const today = new Date().toISOString().slice(0, 10)
const urls = [
  { loc: `${SITE_URL}/`, priority: '1.0', changefreq: 'weekly' },
  { loc: `${SITE_URL}/about`, priority: '0.5', changefreq: 'monthly' },
  ...ids.map(id => ({ loc: `${SITE_URL}/tool/${id}`, priority: '0.8', changefreq: 'monthly' })),
]

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`

const robots = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`

writeFileSync(join(dist, 'sitemap.xml'), sitemap)
writeFileSync(join(dist, 'robots.txt'), robots)
console.log(`[seo] wrote sitemap.xml (${urls.length} URLs) and robots.txt for ${SITE_URL}`)
