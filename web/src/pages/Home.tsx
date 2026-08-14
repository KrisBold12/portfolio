import Label from '../components/Label/Label'
import Num from '../components/Num/Num'
import Panel from '../components/Panel/Panel'
import ProjectCard from '../components/ProjectCard/ProjectCard'
import ReadoutRail from '../components/ReadoutRail/ReadoutRail'
import SiteHeader from '../components/SiteHeader/SiteHeader'
import { projects } from '../data/projects'
import styles from './Home.module.css'

/**
 * The home page: identity, the site's thesis as a single ReadoutRail, then
 * the projects grid. Task 3 (docs/plans/web-frontend.md).
 */
function Home() {
  return (
    <main className={styles.page}>
      <SiteHeader />

      <Panel>
        <ReadoutRail
          title="Top-1 accuracy, 21 shared breeds"
          min={70}
          max={100}
          unit="%"
          markers={[
            {
              value: 94.11,
              label: 'Stanford Dogs',
              color: 'var(--signal)',
              caption: (
                <>
                  Same model, same <Num>21</Num> breeds. Only the photos come from somewhere
                  else.
                </>
              ),
            },
            { value: 87.87, label: 'Oxford-IIIT Pet', color: 'var(--probe)' },
          ]}
        />
      </Panel>

      <section>
        <Label className={styles.projectsHeading}>Projects</Label>
        <ul className={styles.grid}>
          {projects.map((project) => (
            <li key={project.slug}>
              <ProjectCard project={project} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

export default Home
