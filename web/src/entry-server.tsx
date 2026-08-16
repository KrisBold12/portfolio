/**
 * The build-time render. Not shipped to the browser.
 *
 * `scripts/prerender.mjs` calls this once per route and writes the result into
 * the HTML, so a client that does not run JavaScript still receives the page:
 * a crawler that does not render, a link unfurler, a reader tool. Before this
 * existed every route served `<div id="root"></div>` and the home page's head,
 * which meant a shared link to the project page previewed as the portfolio
 * index.
 *
 * StaticRouter rather than BrowserRouter because there is no history to read
 * from; the location is the route being rendered. It is imported from
 * react-router-dom and not react-router even though both export it, because
 * App imports its router from react-router-dom: two specifiers can resolve to
 * two module instances, and then the context the router provides is not the
 * one the routes read. StrictMode is kept so the
 * server tree matches the client tree exactly and hydration has nothing to
 * reconcile.
 *
 * The stylesheet imports live in main.tsx and not here on purpose. Vite emits
 * the CSS from the client build and the template already links it, so pulling
 * it into the SSR bundle would only duplicate it.
 */
import { StrictMode } from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'

import App from './App'

export function render(path: string): string {
  return renderToString(
    <StrictMode>
      <StaticRouter location={path}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
}

export { ROUTES, SITE_URL, OG_IMAGE } from './routes'
