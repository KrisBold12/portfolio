import { Link } from "react-router-dom";
import Label from "../Label/Label";
import Num from "../Num/Num";
import type { Project } from "../../data/projects";
import styles from "./ProjectCard.module.css";

type ProjectCardProps = {
  project: Project;
};

/**
 * One project, one card, the whole card a single link to the project
 * route, focusable once, with a visible focus ring. Figures carry the
 * dataset colour convention — a figure's own `color`, if any, comes from
 * `projects.ts`, never inferred here, matching how ReadoutRail's markers
 * take their colour from the caller.
 */
function ProjectCard({ project }: ProjectCardProps) {
  // A planned card is not a link and not focusable. Rendering it as a dead
  // <Link> would put a stop in the tab order that goes nowhere, and give it
  // the same hover as a card that works.
  if (project.planned) {
    return (
      <div className={`${styles.card} ${styles.planned}`}>
        <Label className={styles.eyebrow}>{project.domain}</Label>
        <h3 className={styles.title}>{project.title}</h3>
        {project.summary && <p className={styles.summary}>{project.summary}</p>}
      </div>
    );
  }

  return (
    <Link to={project.href} className={styles.card}>
      <Label className={styles.eyebrow}>{project.domain}</Label>
      <h3 className={styles.title}>{project.title}</h3>
      <p className={styles.summary}>{project.summary}</p>
      <dl className={styles.figures}>
        {project.figures.map((figure) => (
          <div className={styles.figure} key={figure.label}>
            <dt>
              <Label className={styles.figureLabel}>{figure.label}</Label>
            </dt>
            <dd
              className={styles.figureValue}
              style={figure.color ? { color: figure.color } : undefined}
            >
              <Num>{figure.value}</Num>
            </dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

export default ProjectCard;
