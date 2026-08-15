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
 * - 93.11% top-1 on the 8580-image Stanford test split, measured on the
 *   deployed model: the pretrained ImageNet head restricted to the 120
 *   breeds, which beat all five trained experiments (README, "The result").
 * - 137 ms p95 measured on the deployed service itself (README, "Latency":
 *   "from a laptop in Italy, HTTPS and network included"), not the in-
 *   container or loopback benchmarks quoted elsewhere, which run on other
 *   hardware and skip the network. Not attributable to either dataset, so
 *   it carries no semantic colour.
 * - 88.54% on Oxford-IIIT Pet's 4178 photos of the 21 shared breeds. The
 *   pair with the Stanford figure is the contamination measurement, which
 *   is why both carry their dataset's colour.
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
      "Names one of 120 dog breeds from a photo and turns away anything that is not a dog. The model in production was never trained: it came inside the pretrained backbone, and measuring that is what the project turned into.",
    figures: [
      {
        value: "93.11%",
        label: "Stanford test, 8580 images",
        color: "var(--signal)",
      },
      { value: "137 ms", label: "p95, deployed VPS incl. network" },
      {
        value: "88.54%",
        label: "Oxford photos, 21 shared breeds",
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
