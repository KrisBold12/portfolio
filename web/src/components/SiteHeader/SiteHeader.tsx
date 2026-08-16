import quietLink from '../../styles/quietLink.module.css'
import styles from './SiteHeader.module.css'

const GITHUB_URL = 'https://github.com/KrisBold12'
const EMAIL = 'kristianboldini@gmail.com'

/**
 * The identity block at the top of the home page: the owner's name in the
 * display face, two mono metadata lines, and quiet text links to GitHub and
 * to an email address — not buttons, since they read as citations rather than
 * as calls to action.
 *
 * The two study lines are written in the same shape so that the only thing
 * separating them is the status, and the one that is not conferred yet says
 * so in words. A site whose entire argument is about stating measurements
 * honestly is an unfortunate place to leave a degree ambiguous, and "MSc"
 * next to "BSc" with nothing between them reads as two finished degrees.
 *
 * Chronological, so the block ends on the one that is still running rather
 * than on a finished degree.
 *
 * The address is written into the markup rather than assembled in a handler.
 * Obfuscation trades a little less scraping for the one piece of content on
 * the site that a client which does not run scripts cannot see, and that is
 * the arrangement scripts/prerender.mjs exists to remove; prerender.test.tsx
 * asserts it stays that way.
 *
 * The links sit in an <address>, which is the element for the contact details
 * of the page's author, and the page has exactly one author.
 */
function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <h1 className={styles.name}>Kristian Boldini</h1>
        <span className={styles.meta}>Machine learning engineer</span>
        <span className={styles.meta}>BSc Computer Science, SUPSI</span>
        <span className={styles.meta}>
          MSc Computer Science — Machine Learning, Georgia Tech (in progress)
        </span>
      </div>
      <address className={styles.contact}>
        <a className={quietLink.quietLink} href={GITHUB_URL} target="_blank" rel="noreferrer">
          github.com/KrisBold12
        </a>
        <a className={quietLink.quietLink} href={`mailto:${EMAIL}`}>
          {EMAIL}
        </a>
      </address>
    </header>
  )
}

export default SiteHeader
