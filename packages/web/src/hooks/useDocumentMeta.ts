import { useEffect } from 'react'

const SITE_NAME = 'Quantum Tools'
const DEFAULT_DESCRIPTION =
  '45 free developer utilities that run entirely in your browser — formatters, converters, encoders, PDF tools and calculators. Nothing you paste is ever uploaded.'

function upsertMeta(selector: string, attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href: string) {
  let el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.rel = 'canonical'
    document.head.appendChild(el)
  }
  el.href = href
}

export interface DocumentMeta {
  /** Page-specific title. Omit for the site default. */
  title?: string
  description?: string
}

/**
 * Keeps <title>, description, canonical and the Open Graph/Twitter tags in
 * sync with the current route.
 *
 * This is a single-page app: without this, all 47 routes shared one byte-
 * identical title and description. Every tool competed as the same page in
 * search results, tabs were indistinguishable, and links shared anywhere
 * previewed as the generic site blurb.
 */
export function useDocumentMeta({ title, description }: DocumentMeta) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Free Developer Utilities`
    const desc = description || DEFAULT_DESCRIPTION
    const url = window.location.origin + window.location.pathname

    document.title = fullTitle
    upsertMeta('meta[name="description"]', 'name', 'description', desc)
    upsertCanonical(url)

    upsertMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle)
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', desc)
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', url)
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website')
    upsertMeta('meta[property="og:site_name"]', 'property', 'og:site_name', SITE_NAME)

    upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image')
    upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle)
    upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', desc)
  }, [title, description])
}
