import { useEffect } from 'react'

/**
 * Sets `document.title` and the page's `<meta name="description">` for the
 * current route. There is no server-side render here — the SPA has exactly
 * two routes (Global Constraints), so each page component owns its own
 * title and description and applies them on mount rather than pulling in a
 * head-management library for two call sites.
 */
export function useDocumentMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title

    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'description')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', description)
  }, [title, description])
}
