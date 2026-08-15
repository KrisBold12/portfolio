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
 *   deployed model.
 * - 98.0% of real Oxford dog photos are accepted by the gate, at the 98%
 *   true positive rate the threshold was moved to. The card's three figures
 *   follow the project page's emphasis, so the middle slot goes to the gate
 *   rather than to the second accuracy: a visitor who reads only the card
 *   should learn that the thing knows when to refuse.
 * - 137 ms p95 measured on the deployed service itself (README, "Latency":
 *   "from a laptop in Italy, HTTPS and network included"), not the in-
 *   container or loopback benchmarks quoted elsewhere, which run on other
 *   hardware and skip the network. Not attributable to either dataset, so
 *   it carries no semantic colour.
 *
 * The contamination measurement is in the summary sentence rather than in a
 * figure, since it needs the Stanford/Oxford pair to mean anything and three
 * slots cannot carry a pair plus everything else.
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
      "Names one of 120 dog breeds from a photo, refuses the ones it cannot answer for, and reports a confidence that matches how often it is right. Scored on two datasets, because the usual benchmark is cut from ImageNet and inflates the number by six points.",
    figures: [
      {
        value: "93.11%",
        label: "Stanford test, 8580 images",
        color: "var(--signal)",
      },
      {
        value: "98.0%",
        label: "real dog photos the gate accepts",
        color: "var(--probe)",
      },
      { value: "137 ms", label: "p95, deployed VPS incl. network" },
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
