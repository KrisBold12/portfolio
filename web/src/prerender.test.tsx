import { StrictMode, act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { BrowserRouter, StaticRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import App from './App'
import { DOG_BREED, HOME, OG_IMAGE, ROUTES, SITE_URL } from './routes'
import { attr, head, text } from '../scripts/head.mjs'

/**
 * What the build has to keep true for the prerendered HTML to be worth having.
 *
 * The site is a client-rendered SPA, so before the prerender step every URL
 * served an empty container and the home page's head. These tests guard the
 * two ways that regresses without anything failing: a page that cannot be
 * rendered outside a browser, and a route that exists in the router but not in
 * ROUTES, which would silently go back to being a blank shell.
 */

describe('ROUTES', () => {
  it('has a unique absolute path per entry', () => {
    const paths = ROUTES.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) expect(path.startsWith('/')).toBe(true)
  })

  it('gives every route a title and a description within what a preview shows', () => {
    for (const route of ROUTES) {
      expect(route.title.length).toBeGreaterThan(10)
      // Search results and unfurlers truncate past roughly these lengths, so a
      // longer string is not wrong but its tail is never read.
      expect(route.title.length).toBeLessThanOrEqual(70)
      expect(route.description.length).toBeGreaterThan(50)
      expect(route.description.length).toBeLessThanOrEqual(200)
    }
  })

  it('does not repeat a title or a description between routes', () => {
    expect(HOME.title).not.toBe(DOG_BREED.title)
    expect(HOME.description).not.toBe(DOG_BREED.description)
  })
})

describe('server rendering', () => {
  it.each(ROUTES.map((r) => [r.path, r] as const))(
    'renders %s outside a browser',
    (path, route) => {
      const html = renderToString(
        <StrictMode>
          <StaticRouter location={path}>
            <App />
          </StaticRouter>
        </StrictMode>,
      )

      expect(html.length).toBeGreaterThan(1000)

      // The catch-all redirects unknown paths to the home page, so a route
      // missing from the router would render Home here rather than throw. The
      // project page carries a heading the home page does not.
      if (route === DOG_BREED) {
        expect(html).toContain('Calibrated dog breed classifier')
        expect(html).toContain('93.11%')
      } else {
        expect(html).toContain('Projects')
      }
    },
  )

  it('renders the demo without a browser API', () => {
    // downscale.ts reaches for document.createElement('canvas') and the upload
    // path reaches for fetch. Both must stay inside handlers: touching either
    // during render would throw here and break the build.
    const html = renderToString(
      <StaticRouter location={DOG_BREED.path}>
        <App />
      </StaticRouter>,
    )
    expect(html).toContain('classifier-demo-slot')
  })

  it('puts the contact address in the markup rather than behind JavaScript', () => {
    // The address is on the page to be written to, and an obfuscated one would
    // be the single piece of content on the site that appears only after
    // hydration — the arrangement this whole step exists to remove. Assembling
    // it in a handler would still render and still look right in a browser,
    // so the assertion is on the markup the server produces.
    const html = renderToString(
      <StaticRouter location={HOME.path}>
        <App />
      </StaticRouter>,
    )
    expect(html).toContain('mailto:kristianboldini@gmail.com')
  })
})

describe('head tags', () => {
  const built = (route: typeof HOME) => head({ route, siteUrl: SITE_URL, ogImage: OG_IMAGE })

  it('makes canonical and og:url absolute', () => {
    expect(built(DOG_BREED)).toContain(
      `<link rel="canonical" href="${SITE_URL}/projects/dog-breed" />`,
    )
    expect(built(HOME)).toContain(`content="${SITE_URL}/" />`)
  })

  it('points og:image at an absolute URL, which is the only kind unfurlers fetch', () => {
    expect(built(HOME)).toContain(`property="og:image" content="${SITE_URL}${OG_IMAGE}"`)
  })

  it('escapes quotes so a description cannot close its own attribute', () => {
    const route = { path: '/x', title: 'a & b', description: 'he said "no" & left' }
    const html = head({ route, siteUrl: SITE_URL, ogImage: OG_IMAGE })
    expect(html).toContain('content="he said &quot;no&quot; &amp; left"')
    expect(html).toContain('<title>a &amp; b</title>')
  })

  it('escapes text and attributes differently, since quotes only matter in one', () => {
    expect(attr('"')).toBe('&quot;')
    expect(text('"')).toBe('"')
    expect(text('<b>')).toBe('&lt;b&gt;')
  })
})

describe('hydration', () => {
  /**
   * The check a build cannot make for itself: that the markup React produced
   * on the server is the markup React expects on the client.
   *
   * A mismatch does not throw and does not reach console.error either, which
   * an earlier version of this test assumed and so passed on a deliberately
   * mismatched pair. React routes it to the root's onRecoverableError, patches
   * the DOM, and carries on. The page still works; prerendering simply bought
   * nothing for that subtree. So the hook is the assertion.
   */
  async function hydrationErrors(serverPath: string, clientPath: string) {
    const html = renderToString(
      <StrictMode>
        <StaticRouter location={serverPath}>
          <App />
        </StaticRouter>
      </StrictMode>,
    )

    const container = document.createElement('div')
    container.innerHTML = html
    document.body.appendChild(container)
    window.history.pushState({}, '', clientPath)

    const recovered: unknown[] = []

    // await, not a .then() chain: act returns a thenable of React's own, and
    // chaining onto it does not carry a return value out.
    await act(async () => {
      hydrateRoot(
        container,
        <StrictMode>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </StrictMode>,
        { onRecoverableError: (error) => recovered.push(error) },
      )
    })

    container.remove()
    return recovered
  }

  it.each(ROUTES.map((r) => [r.path] as const))('hydrates %s cleanly', async (path) => {
    expect(await hydrationErrors(path, path)).toEqual([])
  })

  it('would notice if the markup and the route disagreed', async () => {
    // Guards the tests above from passing vacuously: serve the home page's
    // markup, hydrate the project route, and React has to complain.
    const recovered = await hydrationErrors(HOME.path, DOG_BREED.path)
    expect(recovered.length).toBeGreaterThan(0)
  })
})
