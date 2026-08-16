/**
 * Builds the per-route `<head>` the prerender writes.
 *
 * Separate from prerender.mjs so it can be tested without running a build.
 * The escaping is the reason it is worth testing: a description containing a
 * double quote would close the `content` attribute early and turn the rest of
 * the sentence into malformed markup, which no build step would complain
 * about and which only shows up as a broken link preview.
 */

/** Escapes for use inside a double-quoted HTML attribute. */
export function attr(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Escapes for use as HTML text content. */
export function text(value) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * The tags between the two markers in index.html, for one route.
 *
 * og:url and canonical are absolute because both are read by machines that
 * have no base to resolve against, unlike the browser loading the page.
 */
export function head({ route, siteUrl }) {
  const url = siteUrl + (route.path === '/' ? '/' : route.path)
  return [
    `<title>${text(route.title)}</title>`,
    `<meta name="description" content="${attr(route.description)}" />`,
    `<link rel="canonical" href="${attr(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${attr(url)}" />`,
    `<meta property="og:title" content="${attr(route.title)}" />`,
    `<meta property="og:description" content="${attr(route.description)}" />`,
    `<meta property="og:image" content="${attr(siteUrl + route.ogImage)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ].join('\n    ')
}
