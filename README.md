# RAKEZ Scorecard — interactive pitch demo

> Is acquisition lifting the brand, or just buying it?

A mobile-first, fully clickable prototype of the **RAKEZ Acquisition & Brand
Scorecard** described in the build specification: a monthly one-page balanced
scorecard with three hero numbers (Indicator Brand Equity Score 48 → 70,
Google rating 3.7 → 4.3, enquiry → registration conversion ~8%), four
quadrants of four tiles each, and one benchmark chart. Every KPI carries its
definition, source, owner, frequency, baseline, target and RAG thresholds
from the spec's KPI dictionary.

It is a static mock-up with in-memory sample data. It does not read RAKEZ
systems; unsourced KPIs show a dash, never a placeholder number; peer
benchmark values are illustrative and labelled as such.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to dist/
npm run preview    # serve dist/
npm run verify     # Playwright walk-through of every screen + screenshots
```

## What's interactive

- **Scroll-driven building imagery.** A fixed backdrop cross-fades between
  six scenes as you scroll through the scorecard; transparent scene bands
  between panels show it inside the phone frame too, and it changes back as
  you scroll up. Real photographs are a drop-in: see
  `src/assets/photos/README.md`. Until they are added, generated skyline
  plates stand in and are labelled "Illustration".
- **3D KPI skyline.** Nineteen towers (three hero on the central avenue,
  four quadrant blocks of four). Height is progress to target, colour is RAG,
  the wireframe outline is the target. Drag to orbit, hover for the tile,
  tap to open it. Towers grow when you enter a value.
- **3D benchmark chart** with a 2D SVG twin: paired bars per zone (BE score
  /100 teal, Google rating /5 navy), RAKEZ in red, dashed target plane at 70.
  Peer values are editable in a demo modal.
- **Tile sheets** with a demo-entry control (slider, count chips, number,
  claimed toggle) that previews the RAG outcome before applying. Entry is
  locked until the tile's data source is live.
- **Pilot plan**: the 13 data sources as a dependency-locked journey. Marking
  a source live unlocks its tiles (claiming Trustpilot flips its tile from
  red to amber by itself).
- **Brand Equity re-scoring worksheet**: score five weighted dimensions 1–5,
  the composite recalculates live, apply it to the hero card.
- **Mystery-shop log**: log partner calls; the recommendation rate,
  price-match % and script adherence recompute into their tiles.
- **KPI dictionary** with search and quadrant filter, the sources & governance
  view, and the Excel build notes (Data / KPI_Dictionary / Dashboard sheets).
- **Slide view** toggle renders the spec's strict layout — 3 hero, 4 × 4
  tiles, 1 chart, nothing else — for the Option A screenshot.
- **Questionnaire** (seat, cadence, focus) that marks your tiles, leads with
  your cadence and spotlights one hero number.

## Screens

welcome → questionnaire → generating → **scorecard** (⇄ tile sheet, peer
modal) → pilot plan (⇄ step sheet) · KPI dictionary · BE re-scoring ·
mystery-shop log · build options. Back works from every screen; Escape closes
the topmost modal.

## Code map

| File | Role |
| --- | --- |
| `src/data.js` | All content: KPIs, sources, persona, BE dimensions, benchmark, scenes |
| `src/engine.js` | Pure logic: RAG rules, scorecard resolution, plan locks, BE composite |
| `src/ui.jsx` | Shared primitives |
| `src/scenes.jsx` | Scroll backdrop, photo drop-in, generated plates, scene observer |
| `src/three.jsx` | React Three Fiber skyline and benchmark models |
| `src/flow.jsx` | Welcome, questionnaire, generating |
| `src/dashboard.jsx` | Scorecard screen, 2D benchmark, tile sheet, peer modal |
| `src/plan.jsx` | Pilot plan journey and step sheet |
| `src/tools.jsx` | Dictionary / sources / Excel, BE worksheet, shop log, build options |
| `src/App.jsx` | Routing, state, actions, toasts |
| `scripts/verify.mjs` | Playwright walk-through used by `npm run verify` |

## Stack

React 18, Vite 5, Tailwind CSS v4 (`@tailwindcss/vite`), three.js with
`@react-three/fiber` and `@react-three/drei` for the two 3D models. Plain
JavaScript + JSX. No router, no state library, no persistence.
