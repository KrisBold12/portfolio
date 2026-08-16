/**
 * Types for head.mjs, which stays plain JavaScript because `node
 * scripts/prerender.mjs` runs it directly during the build and a TypeScript
 * source would need compiling first.
 *
 * The declaration exists so prerender.test.tsx can import it under the same
 * type checking as the rest of the project, rather than the build failing on
 * an implicit any.
 */
import type { RouteMeta } from '../src/routes'

export declare function attr(value: string): string

export declare function text(value: string): string

export declare function head(input: {
  route: RouteMeta
  siteUrl: string
  ogImage: string
}): string
