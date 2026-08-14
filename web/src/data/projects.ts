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
  value: string;
  label: string;
  color?: string;
};

/**
 * A card is either a project that exists, with a route and measured figures,
 * or one that is planned and has neither. Written as a union rather than as
 * optional fields so a planned card cannot be given a link that goes nowhere.
 */
export type Project = {
  slug: string;
  domain: string;
  title: string;
  summary: string;
} & (
  | { planned?: false; href: string; figures: ProjectFigure[] }
  | { planned: true; href?: never; figures?: never }
);

export const projects: Project[] = [
  {
    slug: "dog-breed",
    href: "/projects/dog-breed",
    domain: "Image classification",
    title: "Dog breed classifier",
    summary:
      "Names one of 120 dog breeds from a photo, and turns away anything that is not a dog before it gets a confident wrong answer. Scored twice, on the usual benchmark and on photos from a different source, because the two disagree by six points.",
    figures: [
      {
        value: "89.99%",
        label: "Stanford test, 8580 images",
        color: "var(--signal)",
      },
      { value: "137 ms", label: "p95, deployed VPS incl. network" },
      {
        value: "95.0%",
        label: "Oxford dog photos accepted",
        color: "var(--probe)",
      },
    ],
  },
  {
    slug: "next",
    planned: true,
    domain: "Project in development",
    title: "Coming soon",
    summary: "",
  },
];
