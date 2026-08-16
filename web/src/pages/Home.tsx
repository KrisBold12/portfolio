import Label from '../components/Label/Label'
import ProjectCard from '../components/ProjectCard/ProjectCard'
import SiteHeader from '../components/SiteHeader/SiteHeader'
import { projects } from '../data/projects'
import { useDocumentMeta } from '../hooks/useDocumentMeta'
import { HOME } from '../routes'
import pageLayout from '../styles/pageLayout.module.css'
import styles from './Home.module.css'

/**
 * The home page: identity, then the projects grid. Task 3
 * (docs/plans/web-frontend.md).
 *
 * This used to carry a standalone ReadoutRail between the identity block
 * and the grid, showing the dog breed classifier's 94.11 / 87.87 with
 * nothing on the page attributing it to that project. It read fine with one
 * card; with more than one it would be an unlabelled pair of figures sitting
 * above a grid, and a visitor couldn't tell which card it belonged to. Home
 * is an index — each card already carries its own attributed figures, so the
 * thesis rail now lives only on the project page where the surrounding text
 * explains it.
 */
function Home() {
  useDocumentMeta(HOME.title, HOME.description)

  return (
    <>
      <SiteHeader />

      <main className={`${pageLayout.page} ${styles.main}`}>
        <section>
          <Label as="h2" className={styles.projectsHeading}>
            Projects
          </Label>
          <ul className={styles.grid}>
            {projects.map((project) => (
              <li key={project.slug}>
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        </section>
      </main>
    </>
  )
}

export default Home
