/**
 * One entry per project card on the home page. Adding a project is a data
 * edit here, not a markup change in Home.tsx or ProjectCard.tsx.
 *
 * `color` on a figure follows the site's dataset colour convention (Global
 * Constraints, "Colour"): a figure measured on Stanford Dogs is `--signal`,
 * one measured on Oxford-IIIT Pet is `--probe`. A figure that isn't
 * attributable to either source (the size of the label space itself) carries
 * no semantic colour and renders in `--bone`.
 *
 * Every value here matches projects/dog-breed/README.md exactly:
 * - 89.99% top-1 on the 8580-image Stanford test split.
 * - 95.0% of real Oxford dog photos are accepted by the OOD gate once its
 *   threshold is calibrated on Oxford's dogs rather than on Stanford's own
 *   validation split (README, "Rejecting what isn't a dog").
 * - 137 ms p95 measured on the deployed service itself (README, "Serving":
 *   "deployed at https://kb-portfolio.dev/api, behind nginx on a 4-vCPU
 *   VPS, at 137 ms p95 including TLS and the network") — not the in-
 *   container or loopback benchmarks quoted elsewhere in the README, which
 *   run on different hardware and skip the network entirely. Not
 *   attributable to either dataset, so it carries no semantic colour, same
 *   as the figure it replaced.
 */
export type ProjectFigure = {
  value: string
  label: string
  color?: string
}

export type Project = {
  slug: string
  href: string
  domain: string
  title: string
  summary: string
  figures: ProjectFigure[]
}

export const projects: Project[] = [
  {
    slug: 'dog-breed',
    href: '/projects/dog-breed',
    domain: 'Image classification',
    title: 'Dog breed classifier',
    summary:
      'A vision model that names one of 120 dog breeds from a single photo, with a gate that turns away images that are not dogs before they get a confident wrong answer. Measured twice: once on the dataset it was trained on, once on photos it has never seen.',
    figures: [
      { value: '89.99%', label: 'Stanford test, 8580 images', color: 'var(--signal)' },
      { value: '137 ms', label: 'p95, deployed VPS incl. network' },
      { value: '95.0%', label: 'Oxford dog photos accepted', color: 'var(--probe)' },
    ],
  },
]
