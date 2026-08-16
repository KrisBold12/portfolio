/**
 * Writes one real HTML file per route, after `vite build` has produced the
 * client bundle and the SSR bundle.
 *
 * The site used to ship a single `<div id="root"></div>` for every URL, so
 * anything that does not execute JavaScript saw nothing: link unfurlers,
 * crawlers that do not render, reader tools. Worse, every route carried the
 * home page's title and description, because those are written at runtime, so
 * sharing the project page previewed as the portfolio index.
 *
 * The markup comes from the same components the browser runs, which is the
 * point. A hand-written static copy would be a second place to update and it
 * would drift on the first change nobody remembered to mirror.
 *
 * Usage: node scripts/prerender.mjs   (see the `build` script in package.json)
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { head } from './head.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const web = join(here, '..')
const clientDir = join(web, 'dist')
const ssrDir = join(web, 'dist-ssr')

const HEAD_START = '<!--head-start-->'
const HEAD_END = '<!--head-end-->'
const APP_HTML = '<!--app-html-->'

async function main() {
  const template = await readFile(join(clientDir, 'index.html'), 'utf8')

  for (const marker of [HEAD_START, HEAD_END, APP_HTML]) {
    if (!template.includes(marker)) {
      throw new Error(`index.html is missing ${marker}; prerender cannot place its output`)
    }
  }

  const entry = pathToFileURL(join(ssrDir, 'entry-server.js')).href
  const { render, ROUTES, SITE_URL } = await import(entry)

  for (const route of ROUTES) {
    const before = template.slice(0, template.indexOf(HEAD_START))
    const after = template.slice(template.indexOf(HEAD_END) + HEAD_END.length)

    const html = (before + head({ route, siteUrl: SITE_URL }) + after).replace(
      APP_HTML,
      render(route.path),
    )

    // `/` is dist/index.html; every other route is a directory with an
    // index.html inside it, which is the shape nginx's `try_files $uri $uri/`
    // resolves without falling through to the SPA rewrite.
    const out =
      route.path === '/'
        ? join(clientDir, 'index.html')
        : join(clientDir, route.path.replace(/^\//, ''), 'index.html')

    await mkdir(dirname(out), { recursive: true })
    await writeFile(out, html, 'utf8')

    const rendered = html.length - template.length
    console.log(`prerendered ${route.path.padEnd(22)} -> ${out.slice(web.length + 1)}  (+${rendered} bytes)`)
  }
}

await main()
