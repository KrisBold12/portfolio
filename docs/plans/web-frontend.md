# Plan — portfolio web frontend

## Context

`web/` is empty. It becomes a React site with two kinds of page: a home listing
the owner's projects as cards, and a project page carrying a working demo plus a
written account of the work.

There is exactly one project so far: the dog breed classifier. Its API runs
locally at `http://127.0.0.1:8000` (`POST /predict`, `GET /health`) and is not yet
deployed. Its README lives at `projects/dog-breed/README.md` and the service is
described in `serving/README.md`; both are the source for the written content.

The site is a job-application portfolio. A reader must, in thirty seconds,
understand what the owner does and see evidence of it. Nothing on the page may be
decorative filler.

## Global Constraints

These bind every task. Copy values verbatim; do not invent alternatives.

### Stack

- Vite + React 19 + TypeScript, in `web/`.
- `react-router-dom` for routing. Two routes: `/` and `/projects/dog-breed`.
- Plain CSS with custom properties for tokens, CSS Modules per component
  (`Component.module.css`). No Tailwind, no CSS-in-JS, no component library.
- `vitest` for unit tests of pure logic only.
- Package manager: `npm`.

### The API

- All calls go through a base path from `import.meta.env.VITE_API_BASE`,
  defaulting to `/api`.
- `vite.config.ts` proxies `/api` to `http://127.0.0.1:8000` with the `/api`
  prefix stripped, so `/api/predict` reaches the service's `/predict`.
- The `/predict` response shape is fixed by the backend and must be typed exactly:

```ts
type Prediction = { id: string; name: string; probability: number }
type OodInfo    = { distance: number; threshold: number }
type PredictResponse = {
  is_dog: boolean
  predictions: Prediction[]
  ood: OodInfo
}
```

- `/predict` takes a multipart form with a single field named `file`.
- Error statuses the UI must handle distinctly: `413` (too large), `400` (not a
  readable image), `422` (no file), anything else (service unavailable).

### Design direction

The site reads as a measuring instrument, not a product brochure. The subject is a
project whose entire thesis is *measuring something everyone else leaves
unmeasured*, so numbers are the content and the chrome stays quiet.

**Colour.** Exactly these, as CSS custom properties on `:root`. Three of them
carry meaning and must never be used decoratively.

```
--ink      #0B0E13   page ground, deep blue-black, never pure black
--panel    #131922   raised panel surface
--rule     #232C39   hairlines, axes, borders
--bone     #E8ECF2   primary text
--muted    #7E8A9C   labels, captions, secondary text
--signal   #F2A63B   MEANING: Stanford Dogs / accepted by the gate / the accent
--probe    #63B6C8   MEANING: Oxford-IIIT Pet / the out-of-source measurement
--reject   #C96A54   MEANING: rejected by the gate
```

The colour of a number says which dataset it came from. A Stanford figure is
`--signal`, an Oxford figure is `--probe`, everywhere on the site, without
exception. This is the structural device: it encodes the project's argument.

**Type.** Three roles, from Google Fonts, loaded with `display=swap` and
preconnect.

| Role | Family | Use |
|---|---|---|
| Display | `Archivo` (variable, wght 400–700, wdth 100–125) | wordmark, page titles, section headings |
| Body | `IBM Plex Sans` (400, 500) | prose |
| Data | `IBM Plex Mono` (400, 500, 600) | every number, axis label, eyebrow, code |

Numbers are always `IBM Plex Mono` with `font-variant-numeric: tabular-nums`. A
number set in the body face is a defect.

Scale, on a 16px root:

```
--fs-display  clamp(2.75rem, 6vw, 4.5rem)   Archivo 700, wdth 115, tracking -0.02em
--fs-h1       clamp(2rem, 4vw, 2.75rem)     Archivo 600, wdth 110
--fs-h2       1.375rem                      Archivo 600
--fs-h3       1.0625rem                     Archivo 600
--fs-body     1.0625rem                     Plex Sans 400, line-height 1.65
--fs-small    0.875rem                      Plex Sans 400
--fs-label    0.75rem                       Plex Mono 500, uppercase, tracking 0.14em
--fs-readout  clamp(1.75rem, 4vw, 2.5rem)   Plex Mono 600, tabular
```

**Spacing.** A 4px scale as custom properties: `--s1` 4px through `--s10` 128px
(4, 8, 12, 16, 24, 32, 48, 64, 96, 128).

**Surfaces.** Panels are `--panel` with a 1px `--rule` border and a 3px radius.
No shadows, no gradients, no glows. The instrument look comes from hairlines and
alignment, not from depth.

**Layout.** Content column max 1120px, gutters 24px below 768px and 48px above.
Prose blocks cap at 68ch. Panels may break out of the prose cap to the full
column width.

### The signature element: ReadoutRail

One component, used for every quantity on the site. It is the thing the site is
remembered by, and it is the only place any visual boldness is spent.

A horizontal measurement axis:

```
  DISTANCE TO NEAREST BREED                         32.41
  ├────────────────▼──────────────┊─────────────────────┤
  0                               49.27 threshold      90
                                  ┆
                      accepted    ┆    rejected
```

- A 1px `--rule` axis spanning the container.
- End ticks with mono labels for `min` and `max`.
- An optional `threshold`: a dashed vertical `--muted` rule with a mono label.
- One or more markers: a small solid triangle plus a mono value, positioned by
  linear interpolation between `min` and `max`, coloured by an explicit prop.
- Optional zone labels either side of the threshold.

Every marker's colour is passed in, never inferred inside the component, so the
meaning stays with the caller.

**Motion.** On mount, and only on mount, each rail performs one calibration
sweep: the axis draws left to right over 400ms, then markers ease into position
over 300ms. This is what an instrument does at power-on and it is the only
animation on the site beyond hover states. It must be skipped entirely under
`prefers-reduced-motion: reduce`, which renders the final state immediately.

### Quality floor

- Responsive from 360px up. No horizontal page scroll at any width.
- `:focus-visible` outline, 2px `--signal`, offset 2px, on every interactive
  element. Never remove focus rings.
- `prefers-reduced-motion: reduce` disables all transitions and animations.
- Semantic HTML: one `<h1>` per page, real landmarks, real `<button>` and
  `<label>` elements, alt text on images.
- Colour is never the only carrier of meaning: accepted/rejected also carries a
  word.

### Content rules

- Written content is drawn from the two READMEs but rewritten shorter for the
  web. Do not paste README paragraphs wholesale.
- Every figure quoted must match the READMEs exactly. The load-bearing ones:
  89.99% Stanford 120 breeds (8580 images), 94.11% Stanford 21 shared breeds,
  87.87% Oxford 21 breeds (4178 images), OOD threshold 49.27 with 95.0% of Oxford
  dogs accepted and 1.18% of cats, temperature 1.21 taking test ECE from 3.12% to
  0.98%, 160.3ms p95 end to end, 100ms median in-container.
- Copy is in English, matching the READMEs. Sentence case. No exclamation marks,
  no emoji, no marketing adjectives.

---

## Task 1: Scaffold, tokens, and the API client

Create the Vite project and everything that later tasks derive from. Nothing
visual beyond a page that renders.

**Deliverables**

1. `web/` containing a Vite React-TS project (`npm create vite@latest`), with
   `react-router-dom` and `vitest` installed. Do not commit `node_modules`; add
   `web/node_modules/` and `web/dist/` to the repo's root `.gitignore`.
2. `vite.config.ts` with the `/api` proxy described in Global Constraints and
   vitest configured (`environment: 'jsdom'` where needed).
3. `web/src/styles/tokens.css` — every colour, type, spacing and radius token
   from Global Constraints, as custom properties on `:root`, plus a short comment
   above the three semantic colours stating what each means.
4. `web/src/styles/base.css` — a reset, `body` set to `--ink`/`--bone` and the
   body face, the font-face loading via `index.html` `<link>` with preconnect,
   the `:focus-visible` rule, and the global `prefers-reduced-motion` block.
5. `web/src/api/client.ts` — the typed `PredictResponse` from Global Constraints,
   plus `predict(file: File): Promise<PredictResponse>` posting multipart to
   `${BASE}/predict`. It maps non-OK statuses onto a discriminated error type
   with a `kind` field distinguishing `too-large`, `not-an-image`, `no-file` and
   `unavailable`, each carrying a user-facing message written per the content
   rules. Network failures map to `unavailable`.
6. `web/src/api/client.test.ts` — vitest tests over a stubbed `fetch` asserting
   each status maps to the right `kind`, and that a 200 returns the parsed body.
7. `App.tsx` with the router and the two routes, rendering placeholder headings.

**Done when** `npm run build` and `npm run test` both succeed, and `npm run dev`
serves a page at `/` and `/projects/dog-breed`.

## Task 2: Primitives and the ReadoutRail

The shared visual vocabulary. No page content.

**Deliverables**

1. `web/src/components/Panel/` — a panel surface per Global Constraints, taking
   an optional `label` rendered as a `--fs-label` eyebrow in `--muted`, and
   children.
2. `web/src/components/Label/` — the mono uppercase eyebrow used on its own.
3. `web/src/components/ReadoutRail/` — the signature component, exactly as
   specified in Global Constraints. Its props:

```ts
type Marker = { value: number; label: string; color: string; caption?: string }
type ReadoutRailProps = {
  title: string
  min: number
  max: number
  markers: Marker[]
  threshold?: { value: number; label: string }
  zones?: { left: string; right: string }
  unit?: string
}
```

4. `web/src/components/ReadoutRail/scale.ts` — the pure positioning maths as a
   separate module: a function turning a value plus `min`/`max` into a percentage,
   clamped to `[0, 100]` so an out-of-range value cannot escape the axis.
5. `web/src/components/ReadoutRail/scale.test.ts` — vitest over the pure
   function: `min` maps to 0, `max` to 100, the midpoint to 50, values outside
   the range clamp rather than overflow, and a zero-width range does not divide
   by zero.
6. The mount sweep and its `prefers-reduced-motion` suppression.

**Done when** the build and tests pass and a temporary route renders a rail with
a threshold, two markers and both zone labels, correct at 360px and 1440px.

## Task 3: Home page

**Deliverables**

1. A site header: the owner's name (`Kristian Boldini`) in the display face, and
   a mono role line. Links to GitHub (`https://github.com/KrisBold12`) as a
   quiet text link, not a button.
2. A single headline finding directly under the identity block, using
   `ReadoutRail`: one accuracy axis from 70 to 100 carrying two markers, 94.11
   in `--signal` labelled Stanford and 87.87 in `--probe` labelled Oxford, with a
   one-sentence caption saying the model and the breeds are identical and only
   the source of the photos differs. This is the site's thesis in one object.
3. A projects grid: 2 columns above 900px, 1 below. One card per project, from a
   `projects.ts` data module so adding a project is a data edit.
4. The card: a mono eyebrow with the project's domain, the title in the display
   face, two sentences, a row of two or three key figures in mono, and the
   dataset colour convention applied. The whole card is one link to the project
   route, focusable once, with a visible focus ring. On hover and focus its
   border goes `--rule` to `--signal` over 150ms and nothing else moves.
5. A second, disabled card reading as "next project" is **not** to be added.
   One project means one card.

**Done when** the page renders at 360px and 1440px with no horizontal scroll,
the card is reachable and activatable by keyboard, and clicking it routes to the
project page.

## Task 4: Project page — the written account

The demo is Task 5. This task builds the page around it, leaving a clearly
marked slot where the demo will mount.

**Deliverables**

1. A back link to `/`, the project title, and a one-sentence thesis line.
2. A slot element for the demo, directly under the header.
3. Five sections, each a heading plus one or two short paragraphs, with the
   figures rendered in `Panel`s or small tables rather than inline in prose:
   - **The finding** — Stanford Dogs is built from ImageNet, all 120 breeds are
     ImageNet classes, so every pretrained backbone has seen the test set. The
     three-way table: 89.99 / 94.11 / 87.87 with image counts. Explain why the
     middle row is needed.
   - **Choosing the model** — the five-configuration table from the README, with
     the observation that the training regime is not what decided the outcome.
   - **Rejecting what isn't a dog** — the Mahalanobis gate, why the negatives are
     cats and not blank walls, and the two-row calibration table.
   - **Making the percentage mean something** — temperature scaling, the ECE
     table, and the point that no prediction changes.
   - **Serving it** — no torch in the container, the parity tests, the latency
     figures, and the open risk on VPS hardware.
4. A closing line linking to the repository.

Tables use mono tabular figures and the dataset colour convention. Every number
must match the READMEs.

**Done when** the page renders correctly at 360px and 1440px, tables scroll
inside their own container rather than widening the page, and every quoted figure
matches the READMEs.

## Task 5: The classifier demo

**Deliverables**

1. `web/src/features/demo/` containing the upload and result UI, mounted in
   Task 4's slot.
2. A drop zone that also opens a file picker on click and on keyboard
   activation, with a real `<input type="file" accept="image/*">` and a `<label>`.
   Drag-over state uses `--signal` on the border only.
3. `downscale.ts` — a pure-as-possible module that, given an image, returns a
   `File` no larger than 1024px on its longest side, re-encoded as JPEG at
   quality 0.9, and returns the original untouched when it is already smaller.
   Uses canvas. Its size-decision maths is a separate exported pure function.
4. `downscale.test.ts` — vitest over the pure decision function: an image under
   the cap is unchanged, one over it scales the long side to exactly 1024 and
   preserves the aspect ratio to the nearest pixel, and both orientations work.
5. A local preview of the chosen image, and a busy state while the request is in
   flight that does not shift layout when it resolves.
6. The result, built from two `ReadoutRail`s and a breed list:
   - **Is it a dog** — a distance rail from 0 to 90 with the threshold at 49.27
     labelled, zones `accepted` / `rejected`, and the measured distance as a
     marker in `--signal` when accepted and `--reject` when not. A plain sentence
     states the verdict in words as well as colour.
   - **How sure** — a confidence rail from 0 to 100 carrying the top
     probability, with a caption giving the empirical meaning: predictions in the
     0.93–1.00 band were right 98.5% of the time on the 8580-image test split.
   - The top five breeds as rows: name, a mono percentage, and a thin bar. When
     `is_dog` is false the list is still shown, under a line explaining that the
     gate did not recognise a dog and these are the closest matches anyway.
7. Every error `kind` from the client renders its own message in the drop zone
   area, with the action the person should take, and leaves the UI usable.

**Done when** an upload against the locally running API returns a result, each
error path can be triggered and renders its own message, and the whole flow is
operable by keyboard alone.

## Task 6: Responsive, accessibility and motion pass

A review-and-repair task over what Tasks 1–5 built. Change only what fails.

**Deliverables**

1. Verify every page at 360, 768, 1024 and 1440px. No horizontal page scroll, no
   overlapping text, no orphaned single-word lines in headings at any width.
2. Keyboard: tab through both pages. Every interactive element reachable, focus
   always visible, order matches visual order, no keyboard trap in the drop zone.
3. `prefers-reduced-motion: reduce`: rails render in final state, no transitions
   anywhere, and nothing becomes invisible or unusable as a result.
4. Contrast: check `--muted` on `--ink` and on `--panel`, and every semantic
   colour on both grounds, against WCAG AA for their sizes. Report the measured
   ratios. If a token fails, adjust that token in `tokens.css` and say so — do
   not patch individual components.
5. `<title>` and a `<meta name="description">` per route, and `lang="en"` on
   `<html>`.
6. Remove any temporary route or scaffolding left from earlier tasks.
7. `npm run build` clean with no TypeScript errors and no unused exports.

**Done when** all of the above are verified and the report states the measured
contrast ratios and the widths checked.
