// @vitest-environment node
//
// Not jsdom, which the rest of the suite uses: under it `import.meta.url` is an
// http URL and cannot be resolved to a path. Nothing here touches a DOM anyway.

/**
 * That every card a route asks for was actually generated.
 *
 * The pairing between `ogImage` in src/routes.ts and `CARDS` in og-image.py is
 * made by hand, because the two run in different languages at different times:
 * the generator is a committed-output script, not a build step. Nothing else
 * would notice a name that got edited on one side only — the build succeeds,
 * the page looks right, and the failure appears the first time somebody pastes
 * the link somewhere and gets a blank rectangle.
 *
 * It lives here rather than beside the other prerender tests because it reads
 * the filesystem, and tsconfig.app.json deliberately carries only the browser
 * types: giving `src` the Node globals to host this one assertion would also
 * be what stops a component reaching for `process.env`.
 */
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ROUTES } from '../src/routes.ts'

const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

describe('og cards', () => {
  it.each(ROUTES.map((r) => [r.path, r.ogImage] as const))(
    '%s has its card committed under public/',
    (_path, ogImage) => {
      expect(existsSync(join(publicDir, ogImage))).toBe(true)
    },
  )
})
