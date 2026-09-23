# CLAUDE.md

## What this project is
**RAKEZ Scorecard** — a mobile-first, fully clickable pitch-demo prototype of
the RAKEZ Acquisition & Brand Scorecard: a monthly one-page balanced scorecard
(3 hero numbers, 4 quadrants × 4 tiles, 1 benchmark chart) that tracks whether
the acquisition strategy lifts brand equity while defending best-in-class
conversion. React 18 + Vite 5 + Tailwind CSS v4, in-memory sample data, no
login, no backend. It must never error, every button must do something, and
back navigation must work everywhere.

## Commands
- Install: `npm install`
- Dev server: `npm run dev`
- Build: `npm run build`
- Preview build: `npm run preview`
- Verify (Playwright walk-through + screenshots to `shots/`): `npm run verify`

## Layout
- `src/data.js` — all content: brand, questionnaire, the 19 KPIs with rules,
  the 13 data-source steps, persona, BE dimensions, benchmark table, build
  options, governance, scene manifest
- `src/engine.js` — pure logic: RAG status rules, attainment, scorecard
  resolution, mystery-shop aggregation, BE composite, plan lock/progress
- `src/ui.jsx` — shared primitives (Modal, Toast, ProgressBar with target
  marker, StatusChip, Segmented, Eyebrow, Panel, buttons)
- `src/scenes.jsx` — scroll-driven backdrop: photo drop-in glob, generated
  skyline plates, IntersectionObserver scene picker, scene bands
- `src/three.jsx` — React Three Fiber models: 19-tower KPI skyline and the
  3D paired-bar benchmark (orbit, hover, tap-to-open)
- `src/flow.jsx` — welcome / mode select, questionnaire, generating screen
- `src/dashboard.jsx` — the scorecard (header zone, hero row, skyline,
  quadrant grid, benchmark 2D/3D, footer) and the tile detail sheet
- `src/plan.jsx` — pilot plan (dependency-locked data-source journey) + step sheet
- `src/tools.jsx` — KPI dictionary / sources / Excel build, BE re-scoring
  worksheet, mystery-shop log, build options
- `src/App.jsx` — screen routing, back map, app state, actions, toasts
- `src/assets/photos/` — drop-in slot for licensed building photographs
  (see its README)

## Rules
- Demo-first: no dead ends, no error states, no network calls, no persistence.
- Guardrail: static mock-up — reads no RAKEZ data. Unsourced KPIs show a dash,
  never a placeholder number. Peer benchmark values are illustrative and are
  labelled as such everywhere they appear.
- Never invent findings, control IDs or figures: baselines and thresholds come
  only from the build spec; anything reconstructed (BE dimension scores) is
  labelled as a sample reconstruction.
- Design: 420px frame on phones, 1080px on `lg`; the frame is transparent so
  the building imagery shows through scene bands between opaque panels. Teal
  primary (buttons/progress), spec navy for titles, spec RAG fills
  (`bg-rag-*`); red only for RAG red / the target marker; status colours
  always ship with an icon + text label, never colour alone.
- Motion: `anim-screen` on every screen root, press-scale on every tappable,
  a toast after every action; backdrop drift is disabled under
  `prefers-reduced-motion`.
- Plain JavaScript + JSX (no TypeScript); Tailwind utility classes for styling.
- 3D labels are DOM (`drei/Html`) so no font files are fetched.
