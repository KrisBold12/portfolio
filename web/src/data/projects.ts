/**
 * One entry per project card on the home page. Adding a project is a data
 * edit here, not a markup change in Home.tsx or ProjectCard.tsx.
 *
 * The summary leads with the finding rather than with what the thing is,
 * because a card in a list is read by someone deciding whether to click and
 * "dog breed classifier" is a title they have seen before. The second sentence
 * carries the description, so nobody is left reading a result without knowing
 * what produced it.
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
 * - 123 ms p95 measured on the deployed VPS over loopback, 200 requests
 *   (README, "Latency"). The loopback figure rather than the end-to-end one:
 *   the number should describe the service, and the end-to-end tail belongs
 *   to whichever connection is doing the measuring. Not attributable to
 *   either dataset, so it carries no semantic colour.
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
 *
 * A planned card still carries a title and a summary. "Coming soon" on its own
 * says only that something is missing; naming the problem says what is being
 * worked on, which is the part worth showing before there is anything to link
 * to. It closes on "Coming soon" so nobody clicks looking for the page.
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
    title: "Calibrated dog breed classifier",
    summary:
      "Measured a six-point generalisation gap that the standard benchmark cannot show, because its test images sit in the training set of every pretrained model. The classifier itself names one of 120 dog breeds, refuses the photos it cannot answer for, and reports a confidence that matches how often it is right.",
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
      { value: "123 ms", label: "p95, deployed VPS" },
    ],
  },
  {
    slug: "triton-kernel",
    planned: true,
    domain: "Project in development",
    title: "When a fused Triton kernel is worth writing",
    summary:
      "A fused kernel is easy to make look fast on its own, because a microbenchmark times the operation and not the model around it. Writes two Triton kernels for the memory-bound tail of a transformer and measures them across batch sizes and sequence lengths, since the activations a fusion saves scale with the tokens processed together while the weights it cannot avoid reading do not. The answer is a crossover rather than a speedup. Coming soon.",
  },
];
