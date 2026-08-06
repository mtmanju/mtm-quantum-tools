# Quantum Tools

**45 developer utilities that run entirely in your browser.**

No accounts, no uploads, no server. Every tool — formatters, encoders, PDF
manipulation, calculators — executes as client-side JavaScript, so nothing you
paste ever leaves your machine.

## Tools

| Category | Tools |
|---|---|
| **Essential** (9) | JSON Formatter · Base64 Converter · URL Encoder · Hash Generator · UUID Generator · Password Generator · JWT Decoder · JWT Generator · Timestamp Converter |
| **Code Tools** (9) | Regex Tester · Diff Checker · Color Converter · Case Converter · Base Converter · Slug Converter · Lorem Generator · HTML Entity · Email Validator |
| **Formatters** (8) | JS · HTML · CSS · SQL · YAML · XML · CSV ↔ JSON · JSON ↔ XML |
| **DevOps** (4) | Cron Parser · IP/CIDR Calculator · Chmod Calculator · API Tester |
| **Documents** (9) | MD Converter (DOCX/PDF/HTML) · PDF Merger · Splitter · Extractor · Rotator · to Image · Watermark · Word Counter · String Inspector |
| **Everyday** (1) | Age Calculator |
| **Finance** (5) | Loan EMI · Loan Repayment · SIP · Compound Interest · Investment Return |

## Getting started

```bash
npm install
npm run dev --workspace @mtm/web     # http://localhost:5173
```

## Scripts

Run from the repo root, or add `--workspace @mtm/web`.

| Command | Purpose |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck, bundle, and generate `robots.txt` + `sitemap.xml` |
| `npm test` | Unit tests (vitest) |
| `npm run test:watch` | Tests in watch mode |
| `npm run lint` | ESLint |
| `npm run preview` | Serve the production build locally |

Set `SITE_URL` when building for production so the sitemap uses real URLs:

```bash
SITE_URL=https://your-domain.com npm run build
```

## Architecture

```
packages/web/
├── src/
│   ├── App.tsx           # Tool registry + routing
│   ├── tools/            # One component + stylesheet per tool
│   ├── utils/            # Pure logic, framework-free (the unit-test surface)
│   ├── components/ui/    # Shared primitives: Toolbar, EditorPanel, ErrorBar…
│   ├── hooks/            # useCopy, useFileUpload, useDocumentMeta…
│   └── App.css           # Design tokens + global layout
└── scripts/              # Build-time SEO asset generation
```

**Stack:** React 19 · TypeScript 5.9 · Vite 7 · React Router 7 · lucide-react.
Heavy dependencies (mermaid, pdf.js, pdf-lib, docx) are reachable only through
`React.lazy()` boundaries, keeping first load to ~92 KB gzipped.

### Adding a tool

1. Create `src/tools/MyTool.tsx` and `MyTool.css`.
2. Put the logic in `src/utils/myTool.ts` — pure functions, no React — and test it.
3. Register it in `src/App.tsx`: add a `lazy()` import and an entry in `tools[]`.

The sitemap picks it up automatically from the registry.

## Conventions

- **Logic lives in `utils/`, not components.** Components wire UI to pure
  functions; that's what makes the behaviour testable.
- **No hardcoded colours.** Use the CSS custom properties in `App.css` so both
  themes work.
- **Nothing leaves the browser.** No analytics beacons, no CDN fetches at
  runtime, no network calls except the ones the API Tester makes on the user's
  explicit instruction.

## License

MIT
