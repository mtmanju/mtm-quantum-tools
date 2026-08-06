#!/usr/bin/env node
/**
 * Prerender a static HTML shell for every route.
 *
 * The app is a client-rendered SPA: `dist/index.html` ships an empty
 * `<div id="root">`. Googlebot defers JS rendering to a second pass, and
 * Bing / DuckDuckGo / Slack / Reddit / X largely don't execute JS at all — so
 * 45 tool pages that exist only after hydration have no crawlable content, no
 * snippet and no link preview.
 *
 * This writes `dist/tool/<id>/index.html` for each tool with real, indexable
 * content (an <h1>, a description, an FAQ, JSON-LD) while still booting the
 * same SPA bundle. Once React mounts it replaces `#root`, so users see the
 * normal app and crawlers see the prose.
 *
 * Deliberately not vite-ssg or a Puppeteer snapshot: several tools touch
 * browser APIs at module scope, and snapshotting a hydrated tool page yields
 * an empty textarea — content-thin pages that risk being treated as doorways.
 * The ranking asset here is hand-authored per-tool copy.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const webRoot = join(__dirname, '..')
const dist = join(webRoot, 'dist')

if (!existsSync(join(dist, 'index.html'))) {
  console.error('[prerender] dist/index.html not found — run after `vite build`.')
  process.exit(1)
}

const SITE_URL = (process.env.SITE_URL || 'https://quantum-tools.example').replace(/\/$/, '')
const SITE_NAME = 'Quantum Tools'

// ── Parse the tool registry out of App.tsx ────────────────────────────────
const appSrc = readFileSync(join(webRoot, 'src/App.tsx'), 'utf8')
const start = appSrc.indexOf('const tools: Tool[] = [')
const end = appSrc.indexOf('\n]', start)
const registry = appSrc.slice(start, end)

const entryRe =
  /\{\s*id:\s*'([a-z0-9-]+)',\s*name:\s*'((?:[^'\\]|\\.)*)',\s*description:\s*'((?:[^'\\]|\\.)*)'[\s\S]*?category:\s*'([^']+)'/g

const tools = []
let m
while ((m = entryRe.exec(registry)) !== null) {
  tools.push({
    id: m[1],
    name: m[2].replace(/\\'/g, "'"),
    description: m[3].replace(/\\'/g, "'"),
    category: m[4],
  })
}

if (tools.length === 0) {
  console.error('[prerender] parsed 0 tools from App.tsx — refusing to emit empty shells.')
  process.exit(1)
}

const esc = s =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ── Per-tool copy ─────────────────────────────────────────────────────────
function faqFor(tool) {
  return [
    {
      q: `Is ${tool.name} free to use?`,
      a: `Yes. ${tool.name} is completely free, with no account, sign-up or usage limits.`,
    },
    {
      q: `Is my data uploaded anywhere?`,
      a: `No. ${tool.name} runs entirely in your browser using JavaScript. Nothing you paste or upload is ever sent to a server, which makes it safe for confidential data.`,
    },
    {
      q: `Does ${tool.name} work offline?`,
      a: `Once the page has loaded, all processing is local, so it keeps working without a network connection.`,
    },
  ]
}

function bodyFor(tool) {
  const faqs = faqFor(tool)
  return `
    <main class="prerender">
      <h1>${esc(tool.name)}</h1>
      <p>${esc(tool.description)}. Free, instant, and runs entirely in your browser —
         nothing you paste is ever uploaded to a server.</p>
      <h2>About this tool</h2>
      <p>${esc(tool.name)} is part of ${SITE_NAME}, a collection of ${tools.length} developer
         utilities in the ${esc(tool.category)} category. All processing happens locally in
         your browser, so it is safe to use with private or production data.</p>
      <h2>Frequently asked questions</h2>
      <dl>
        ${faqs.map(f => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join('\n        ')}
      </dl>
      <p><a href="/">Browse all ${tools.length} tools</a></p>
    </main>`
}

function jsonLdFor(tool) {
  const url = `${SITE_URL}/tool/${tool.id}`
  return JSON.stringify([
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name,
      description: tool.description,
      url,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqFor(tool).map(f => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ])
}

// ── Emit ──────────────────────────────────────────────────────────────────
const template = readFileSync(join(dist, 'index.html'), 'utf8')

/**
 * The boot skeleton, lifted out of the template so the two can never drift.
 *
 * Prerendered pages keep BOTH the skeleton and the prose: an inline script in
 * index.html marks the document as JS-capable, and the stylesheet shows the
 * skeleton to browsers and the prose to crawlers that do not run scripts.
 * Emitting only the prose meant every visitor watched a centred wall of text
 * flash past before React replaced it.
 */
const skeletonMatch = /<div id="boot-skeleton"[\s\S]*?<\/div>\s*<\/div>/.exec(template)
const SKELETON = skeletonMatch ? skeletonMatch[0] : ''
if (!SKELETON) {
  console.warn('[prerender] boot skeleton not found in template — pages will flash prose before hydrating.')
}

/** Swap title/description/canonical/OG and inject prerendered body + JSON-LD. */
function render({ title, description, canonical, body, jsonLd }) {
  let html = template

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`)
  html = html.replace(
    /<meta name="description" content="[\s\S]*?"\s*\/?>/,
    `<meta name="description" content="${esc(description)}" />`
  )

  const head = [
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(title)}" />`,
    `<meta name="twitter:description" content="${esc(description)}" />`,
    jsonLd ? `<script type="application/ld+json">${jsonLd}</script>` : '',
  ].join('\n    ')

  html = html.replace('</head>', `  ${head}\n  </head>`)

  // Replace the boot skeleton with real content. React discards it on mount.
  // Anchor on </body> rather than a following <script>: Vite hoists the module
  // script into <head>, so nothing necessarily follows #root.
  const rootRe = /<div id="root">[\s\S]*?<\/div>\s*<\/body>/
  if (!rootRe.test(html)) {
    throw new Error('[prerender] could not locate #root in the built template — aborting.')
  }
  html = html.replace(rootRe, `<div id="root">${SKELETON}${body}</div>\n  </body>`)
  return html
}

const siteDescription =
  `${tools.length} free developer utilities that run entirely in your browser — formatters, converters, encoders and PDF tools. Nothing you paste is uploaded, logged, or sent anywhere.`

// Index
const byCategory = tools.reduce((acc, t) => {
  ;(acc[t.category] ||= []).push(t)
  return acc
}, {})

const indexBody = `
    <main class="prerender">
      <h1>Developer tools that never see your data</h1>
      <p>${esc(siteDescription)} That makes them safe for the tokens, payloads and
         customer data you are not allowed to paste into a website.</p>
      <p>Paste a JWT, JSON, Base64, a Unix timestamp, a URL or a cron expression and
         the right tool is applied automatically — or pick one below.</p>
      ${Object.entries(byCategory)
        .map(
          ([cat, list]) => `<h2>${esc(cat)}</h2>
      <ul>
        ${list
          .map(t => `<li><a href="/tool/${t.id}">${esc(t.name)}</a> — ${esc(t.description)}</li>`)
          .join('\n        ')}
      </ul>`
        )
        .join('\n      ')}
    </main>`

writeFileSync(
  join(dist, 'index.html'),
  render({
    title: `${SITE_NAME} — Free Developer Utilities`,
    description: siteDescription,
    canonical: `${SITE_URL}/`,
    body: indexBody,
    jsonLd: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL,
      description: siteDescription,
    }),
  })
)

// One shell per tool
for (const tool of tools) {
  const dir = join(dist, 'tool', tool.id)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'index.html'),
    render({
      title: `${tool.name} · ${SITE_NAME}`,
      description: `${tool.description}. Free, instant, and runs entirely in your browser — nothing is uploaded.`,
      canonical: `${SITE_URL}/tool/${tool.id}`,
      body: bodyFor(tool),
      jsonLd: jsonLdFor(tool),
    })
  )
}

// About
mkdirSync(join(dist, 'about'), { recursive: true })
writeFileSync(
  join(dist, 'about', 'index.html'),
  render({
    title: `About · ${SITE_NAME}`,
    description: siteDescription,
    canonical: `${SITE_URL}/about`,
    body: `<main class="prerender"><h1>About ${SITE_NAME}</h1><p>${esc(siteDescription)}</p><p><a href="/">Browse all ${tools.length} tools</a></p></main>`,
    jsonLd: '',
  })
)

console.log(`[prerender] wrote ${tools.length + 2} static shells for ${SITE_URL}`)
