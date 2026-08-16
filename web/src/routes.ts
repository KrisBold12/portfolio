/**
 * The routes, and the head each one needs.
 *
 * This exists because the same two strings are needed in two places that run
 * at different times: the page components set them at runtime through
 * useDocumentMeta, and the prerender script writes them into the HTML at build
 * time. Declaring them twice would let the runtime title and the crawled title
 * drift apart, and nothing would fail when they did.
 *
 * `path` is also what the prerender script renders and where it writes: `/`
 * becomes dist/index.html and `/projects/dog-breed` becomes
 * dist/projects/dog-breed/index.html, which nginx serves directly because its
 * `try_files $uri $uri/ /index.html` finds the real file before reaching the
 * SPA fallback.
 */
export type RouteMeta = {
  path: string
  title: string
  description: string
  /**
   * The 1200x630 card unfurlers show, 1:1 with a `CARDS` entry in
   * scripts/og-image.py and committed under public/.
   *
   * Per route rather than one shared image, because `summary_large_image`
   * gives the picture most of the preview and the title a single line under
   * it: with one card for the whole site every link previewed as the
   * portfolio index no matter which page was shared, which is the same
   * complaint that produced the prerender step and was only half fixed by it.
   */
  ogImage: string
}

export const SITE_URL = 'https://kb-portfolio.dev'

export const HOME: RouteMeta = {
  path: '/',
  title: 'Kristian Boldini — Machine learning engineer',
  description:
    'Portfolio of Kristian Boldini, a machine learning engineer. Project pages built on measurements, starting with a dog breed classifier scored on two datasets to show how inflated the benchmark is.',
  ogImage: '/og.png',
}

export const DOG_BREED: RouteMeta = {
  path: '/projects/dog-breed',
  title: 'Calibrated dog breed classifier — Kristian Boldini',
  description:
    'A six-point generalisation gap the standard benchmark cannot show, measured on a dog breed classifier that also refuses the photos it cannot answer for and states a confidence matching its accuracy.',
  ogImage: '/og-dog-breed.png',
}

export const ROUTES: RouteMeta[] = [HOME, DOG_BREED]
