import styles from './SiteHeader.module.css'

const GITHUB_URL = 'https://github.com/KrisBold12'

/**
 * The identity block at the top of the home page: the owner's name in the
 * display face, a mono role line, and a quiet text link to GitHub (not a
 * button — Task 3 brief).
 */
function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.identity}>
        <h1 className={styles.name}>Kristian Boldini</h1>
        <span className={styles.role}>Machine learning engineer</span>
      </div>
      <a
        className={styles.github}
        href={GITHUB_URL}
        target="_blank"
        rel="noreferrer"
      >
        github.com/KrisBold12
      </a>
    </header>
  )
}

export default SiteHeader
