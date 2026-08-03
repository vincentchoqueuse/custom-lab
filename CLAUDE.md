# expe34 — a scientific demonstration engine for teaching

*(the name is a nod to the GR 34, the Breton coastal trail: a long route made
of many short well-marked stages, walked one at a time and always in the same
order. The default seed is 34 for the same reason.)*

Document organized from durable to interchangeable:
**Vision → Concepts → UX → Architecture → Implementation.**

---

# 1. Vision

A **purely static** web application (no server, deployable on Netlify) that serves as a
**live demonstration instrument for lecture halls**: a catalog of interactive
experiments (statistics, estimation, detection, digital communications) that are
scriptable, projectable, and drivable. Not a course companion — the professor's bench.

Project identity: **static, reproducible, declarative, centered on pedagogical
staging rather than parameter editing.**

## Non-negotiable principles

1. **Fully static.** Everything runs in the browser. No backend, no API. A
   deployment may carry the whole catalogue or A SINGLE SUBJECT:
   `EXPE34_SUBJECT=control npm run build` rewrites the four glob patterns at
   build time (`scripts/subject-filter.js`) — 172 kB gzip → 118 kB, and the
   sidebar simply shows the one subject. Filtering at runtime would be pointless:
   `import.meta.glob` needs a literal pattern, so everything would already be in
   the bundle.
2. **The URL is the API.** All state (experiment, params, view, preset, panels) is
   encoded in the hash. One link = one reproducible lecture scene.
3. **Declarative.** Each experiment is a self-contained directory described by a
   manifest. The core knows no experiment by name.
4. **Adding an experiment never modifies the core.** Automatic discovery via
   `import.meta.glob`. Zero hand-maintained index files. **The core knows no
   experiment, and that is now checked**: no file of `src/core/` may import
   anything under `src/experiments/` (`npm run check`, layering). Code shared by
   ONE subject lives with that subject, in `experiments/<subject>/_lib/`; only
   code used across subjects earns a place in `core/`.
5. **Strict layer separation**: scientific computation → observables → declarative
   views → graphic components. Views NEVER perform scientific computation.
6. **AGPL-3.0. Code, UI, and commits in English.** Pedagogical content (param labels,
   experiment titles, teacher notes, preset names) is authored in the course's teaching
   language — French for ENIB courses — and lives entirely in the manifests. All UI
   strings of the core are centralized in a single `src/core/strings.js` module
   (plain English constants, no i18n framework — extension point per principle 7).
7. **Extension points over premature features.** Any future capability (stories,
   incremental execution, remote control, voting, annotations) must be addable without
   breaking the manifest and compute contracts, but **no dedicated infrastructure is
   implemented before a concrete need justifies it.** This principle overrides any
   proposal to enrich the model.

---

# 2. Concepts

## The experiment

An **experiment** is a self-contained pedagogical object: one computation, named
observables, representations, lecture scenes, actions. It lives in one directory,
described by a declarative manifest.

## Data flow

```
compute(params)          — pure, seeded, stateless, runs in a worker
      ↓
observables              — named, typed, serializable quantities
      ↓
declarative views        — {type, source, overlays, layout} in the manifest
      ↓
graphic components       — generic (Histogram, Line, Scatter…), reused everywhere
```

## Observables

Every displayable quantity is a named observable produced by `compute()`. Its type is
**inferred by default** (`Float64Array` → vector, `number` → scalar, `string` → text,
`{x, y}` → series, `[{...}]` → records); an optional `meta` field resolves ambiguities
and adds richness (unit, label, precision). A `text` observable is a reading like any
other — a regime name, a verdict — and shows in the statline beside the numbers. Export, inspector and overlays rely on these types
— without imposing ceremony on the simple case.

## Scenes (presets)

A preset is a complete lecture scene: params, active view, visible pills, masked
params (black box), panel states, teacher notes. Presets chain via keyboard (←/→):
the preset list IS the lecture script.

## Actions

An action is a named operation exposed by the core or an experiment
(`randomizeSeed`, `resetDefaults`, `revealHidden`, `freeze`, `exportSvg`,
`exportPng`…). The view bar renders the actions declared in the manifest, as icon +
shortcut flush right on the tabs line; keyboard shortcuts bind to them. Adding an
action never requires touching the UI.

## Engine capabilities (anti-regression checklist)

An experiment can:
- ✓ produce typed observables
- ✓ have multiple views (declarative, or custom with justification)
- ✓ have multiple presets/scenes with teacher notes
- ✓ be replayed identically (seed in the URL)
- ✓ be driven by URL (full state in the hash)
- ✓ be driven by keyboard (lecture-ready shortcuts)
- ✓ expose actions in the view bar
- ✓ be numerically verified (`check.js`)
- ✓ be exported (SVG, PNG, clipboard)
- ✓ be inspected (raw observables, developer panel)
- ✓ be frozen for before/after comparison (`freeze` action)
- ✓ survive live teaching (worker timeout, graceful compute errors)
- ◌ be storyboarded (stories) — extension point, not implemented
- ◌ run incrementally (`step()`, recorders) — extension point
- ◌ be remote-controlled (WebRTC) — extension point
- ◌ be driven by a MIDI controller (Web MIDI, pills ↔ CCs) — extension point
- ◌ be animated (parameter sequences) — extension point

---

# 3. UX

## Philosophy: modern chatbot, not dashboard

The interface drops the cluttered academic-dashboard structure (MATLAB/RStudio) in
favor of the clean, centered ergonomics of a modern chatbot (Open WebUI / ChatGPT /
Claude.ai):

- **The plot is the answer**: the central area is devoted to the chart card, with
  zero distraction.
- **The Prompt Bar**: the scene's 2–4 priority parameters are editable pills at the
  bottom — where a chatbot puts its input box, and nothing else there.
- **Preset as model picker**: lecture scenes are selected from a central dropdown in
  the header, like choosing `GPT-4o / Claude` in a chatbot.
- **Progressive disclosure**: ultra-clean screen by default; the full parameter
  drawer opens only for secondary variables.

## Reference layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ☰  Statistics / Confidence intervals      [ Preset: All is well ▾ ] [🔗] [L] │
├──────────────────────────────────────────────────────────────────────────┤
│ 🗒 [Teacher Mode banner — current scene notes, when enabled]             │
├──────────────────────────────────────────────────────────────────────────┤
│  [Realizations | Distribution of x̄ | Coverage vs N]     [🎲 R][❄ F][⚙ P] │
│                                                                          │
│                       [ MAIN PLOT CARD ]                                 │
│                                                                          │
│            statline: coverage = 0.948 · half-width ±0.72                 │
├──────────────────────────────────────────────────────────────────────────┤
│  [ 🎛 N = 30 ] [ 🎛 1−α = 0.95 ]                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

(Tab titles, pill labels and preset names above come from the manifest and are shown
in the course language; the chrome — Parameters, Draw, Presets, Search… — is English.)

## Interface components

**Left sidebar (Open WebUI style).** Theme-aware neutral (`#f9f9f9` light /
`#171717` dark), ~260 px, collapsible (`⌘B`), rounded items, soft gray hover,
active item in neutral gray (never a color accent). Top button: "Search
experiments" (`⌘K`). Tree: subjects (small muted sentence-case labels,
ChatGPT-style, collapsible with a hover-only chevron) → experiments.
Footer: light/dark theme toggle for the central area, Teacher Mode button (🗒).

**Clean header.** Breadcrumb `Subject / Experiment`. **Central preset selector**,
LLM-model-picker style — one click applies the full scene. Right side: copyable URL
chip, presentation mode button (`L`).

**Central area.** Teacher Mode banner (scene notes; never projected by default, never
in the URL). Light-background PlotFrame (projector legibility), pure SVG rendering,
statline of key observables, export. Minimal tabs when the experiment has several
views.

**View bar (tabs line).** The representations on the left when the experiment has
several — a segmented control on a desktop or a projector, where the room should see
that there ARE four readings before any is opened, and a NATIVE `<select>` below
860 px, because six tabs the length of "Réponse impulsionnelle" do not fit a phone.
Both are in the DOM, CSS shows exactly one, and the native picker buys the platform's
own wheel plus keyboard and screen-reader support for nothing. Flush right, the
instrument's actions — `randomizeSeed`, `freeze`, the
Parameters toggle, `revealHidden` when a pill is masked. **Icon + shortcut only**:
the icon is read at a glance from the back of the room and the letter is what the
hand presses; the words were the widest part and said the least. Full labels live in
the tooltip and the aria-label. On a phone the shortcut hint disappears, the icons
stay.

**Prompt Bar (bottom bar).** Fixed at the bottom, inspired by LLM input bars, and
holding ONLY the pills = the active preset's `visible` params. Clicking a pill opens
a **NON-modal popover** (slider/toggle) above it — the popover stays open while
dragging and **the plot remains fully visible**: the look→adjust→look loop is never
interrupted. A scene with no visible pill shows no bar at all.

**Parameter drawer (right slide-in).** Hidden by default, slides in (~300 px),
generated from the schema (groups, visibleIf, validate, derived, display). Contains
ALL parameters. **Never a modal for parameters, here or anywhere.**

**Inspector (developer panel).** Discreetly accessible (menu or shortcut): list of the
current experiment's observables with type, dimensions, value preview, download. A
debugging tool for experiment authors, not shown in class.

## Keyboard shortcuts (lecture-ready)

Canonical table — any shortcut change happens HERE and nowhere else:

| Key | UX action | Mnemonic |
|---|---|---|
| `⌘K` / `Ctrl+K` | Open the Command Palette (experiment search) | *K* — standard |
| `⌘B` / `Ctrl+B` | Show / hide the Sidebar | side**B**ar |
| `P` | Open / hide the parameter Drawer | **P**arameters |
| `R` | `randomizeSeed` action (draw again) | **R**andomize |
| `F` | `freeze` action — freeze/unfreeze the plot for before/after comparison (phase 3) | **F**reeze |
| `A` | Lock / unlock the plot axes (the frame stays put while the curve moves) | **A**xes |
| `L` | **L**ecture Presentation Mode: **fullscreen** (Fullscreen API) + strokes ×1.6 + type ×1.3 + minimal chrome | **L**ecture |
| `←` / `→` | Previous / next preset (the lecture script on keys) | — |
| `Esc` | Exit fullscreen / clear freeze ghost / close popover or palette / show hidden series | — |

Rules: single-letter shortcuts are inert while a text field has focus; fullscreen uses
the browser Fullscreen API (native `Esc` exit).

## Display modes

- **Prompt Bar**: always visible; `masked` → the pill shows "?" (black box),
  `revealHidden` action to unveil.
- **Drawer**: closed by default, state in the URL, controllable per preset.
- **Teacher Mode**: scene-notes banner above the plot.
- **Presentation Mode** (`L`): readable from the back of a lecture hall.
- **Freeze frame** (`F`, `freeze` action): the current plot is pinned as a **gray
  dashed ghost in the background**; any subsequent change (slider, draw) renders on
  top in color. The pedagogical sequence question → prediction → observation →
  explanation becomes one gesture: freeze, ask, move, compare. Re-freezing replaces
  the ghost; `Esc` or `F` again clears it. Universal implementation: snapshot of the
  rendered SVG (grayed DOM clone under the plot), which works for any view —
  declarative or custom — without touching views or compute. The ghost is display
  state, NOT in the URL (not link-reproducible, by design).
- **Legend toggle**: clicking a legend chip hides or shows that series
  (keyboard: focus the chip, `Enter`). On a view that stacks three
  estimators, "look at this one alone" is the gesture a hand makes in front
  of the screen and that nothing else replaces. The hidden layer is not
  rendered at all rather than made transparent, so the SVG export and the
  freeze ghost — both DOM clones — carry exactly what the room sees. Display
  state, NOT in the URL (like the ghost and the axis lock); cleared when the
  view or the experiment changes, and by `Esc` once nothing else is open.
- **Axis lock** (`A`, or the Axes button on the plot card): each declarative
  plot pins the domains it had when the lock was switched on, so moving a
  parameter afterwards moves the CURVE and not the frame — auto-scaling
  otherwise hides the very effect being demonstrated. Display state, NOT in the
  URL (like the freeze ghost); cleared when the view or the experiment changes.
  A scene may declare `lock: true` to arrive with the frame already pinned —
  scene state, still never in the URL. Custom views keep their own scales and
  ignore it.
- **Export**: SVG (source of truth), PNG 2×, PNG copy to clipboard.

---

# 4. Architecture

## Contract: compute.js and observables

```js
/**
 * PURE. Stateless, no UI dependency, no DOM access. Runs in a Web Worker.
 * Deterministic at fixed seed. NO lifecycle (setup/reset/dispose): purity is what
 * makes compute testable in Node, cacheable and transferable — an optional
 * incremental step() contract may one day exist ALONGSIDE it, never instead of it.
 * @param {object} params — values conforming to the manifest schema
 * @returns {{ observables: Object }}
 */
export function compute(params) {
  // ...
  return {
    observables: {
      means: mFloat64,                        // inferred: vector
      coverage: 0.948,                        // inferred: scalar
      theoreticalDensity: { x, y },           // inferred: series
      intervals: [{ lo, hi, ok }],            // inferred: records
      meanHalfWidth: { value: 0.72,           // optional meta when useful
                       meta: { label: 'mean half-width', precision: 2 } },
    },
  };
}
```

Rules:
- Every displayable quantity is a named observable; views and overlays reference them
  by name and never compute anything scientific (pixel scaling: yes; variance: never).
- Seeded RNG (`core/rng.js`, mulberry32) exclusively. Never `Math.random()`.
  A compute that reaches it — directly or through a `_lib` module — makes its
  experiment `random: true`, and that correspondence is enforced by `npm run check`.
- `Float64Array` vectorization in hot loops; no arrays of objects on hot paths.
- Serializable data only (worker → UI transfer).

## Core defaults (convention over configuration)

To keep experiments minimal, the core applies these defaults; a manifest only writes
what deviates. **These conventions are part of the core contract** (applied by the
registry at load time):

- **`random: true` declares that the experiment DRAWS**, and only then is a
  `seed` param injected (`type: 'seed'`, default 34). Purity and reproducibility
  remain contract requirements for every compute; what is declared here is
  whether there is anything to re-draw. Half the catalogue draws nothing at all —
  a Bode plot, a convolution, a pole map — and a dice button that provably cannot
  change the picture is a promise the instrument does not keep. A deterministic
  experiment therefore has no seed field, no dice, no `R`, and no `?seed=` in its
  URL. **The declaration is checked, not trusted**: mulberry32 is the only
  generator the project allows, so "this experiment draws" is exactly "its compute
  reaches `core/rng.js`", directly or transitively — `npm run check` fails a
  manifest that declares `random: true` without a generator, and one that uses a
  generator without declaring it.
- **`type: 'float'`** is the implicit param type.
- **`actions`** defaults to `['randomizeSeed', 'freeze']` — `['freeze']` alone when
  the experiment is not `random`. `resetDefaults` stays in the registry for a
  manifest that wants it: in a lecture the scene picker IS the reset. Actions live
  in the view bar (tabs line, flush right), as icon + shortcut. A keyboard
  shortcut obeys the same list: `R` is inert where there is no seed to bump.
- **`groups`** absent → one flat group.
- **`layout: 'plot'`** is implied when a view has a `plot` key.
- **Standard figures are named once** in `core/figures.js`. A manifest declares
  `figure('gain', …)` and never a title; the registry stamps the global id and
  the subject's own name for it (`_subject.js` → `figures` for the variant,
  `figureOrder` for the tab grammar). The rule the registry enforces at load
  time, and `npm run check` repeats: **a canonical id carries the canonical
  title, or the view takes an id of its own.** A pole map called "Plan des
  pôles" while every other one says "Pôles et zéros" is a load-time error, not
  a thing to notice in class.
- **`order` ranks the experiment inside its subject** — the lecture progression, not
  the alphabet: the sidebar and the palette read a subject in the order the course
  meets its demos. Absent → the experiment lands at the end of its subject,
  alphabetically, so adding one still modifies nothing else (principle 4).
  `_subject.js` carries the same key for the subjects themselves.
- **`scenes.js` is auto-discovered** by the registry (same glob as manifests) and
  merged as `presets`. In a scene: `view` defaults to the first view, `drawer` to
  `false`, `masked` to `[]`, `lock` to `false`.
- **`story`** absent → reserved extension point (state-machine lead noted in phase 5).
- **Params are declared with field factories** from `core/fields.js` (Django-style):
  `float`, `int`, `bool`, `select`, `log`, `readonly`. Factories return the plain
  param objects the registry consumes, **validate at load time** (min < max, default
  within bounds, select default present in options, sane step) and **throw named
  errors** — a typo fails at first `npm run dev`, never silently in class.
  **Three separate semantic keys, never concatenated in one string**:
  `name` — the displayed symbol ('f', 'φ', 'N'; first positional argument, defaults
  to the param key); `description` — what it is ('fréquence', 'phase'); `unit` —
  'Hz', 'rad', 'dB'. Rendering: pills show `name = value unit`; the drawer shows
  the name with the description as secondary text; the description also feeds the
  tooltip. Every param has a `default` (no nullable fields: the URL contract and
  resetDefaults require it); every other key is optional.
- **Views are declared with factories** from `core/views.js`, mirroring the field
  factories: `view(id, title, plotSpec)`, `custom(id, title, loader)`, and one
  factory per graphic type — `histogram`, `line`, `scatter`, `bars`, `stem`, `vline`,
  `hline`, `density`, `band`. The same factory works as main plot or as overlay,
  by position, plus `plane(id, title, spec)` for the one shape a cartesian
  plot cannot express (equal-aspect I/Q, s- and z-planes: circles must stay
  circles). Style keys are **flat** (`color`, `dashed`, `width` — no nested
  `style` object), consistent with the field factories. Factories validate at load
  time (known types, sane axes/scale/domain) and throw named errors; observable
  `source` names, unknowable at load time, are cross-checked against the first
  compute result in dev mode — a view referencing a missing observable warns
  immediately instead of rendering an empty plot.
- **`core/checks.js`** provides `standardChecks` factories (e.g.
  `standardChecks.determinism(compute, params, observableName)`); the determinism
  check is mandatory and scaffolded by default. It also provides the helpers
  that make a check read like the identity it asserts rather than like a loop:
  `maxGap(points, f, g)` (worst |f−g| over the points, or worst |f| with one
  function), `maxAbsDiff(a, b)` and `range(n, f)`.

## Contract: manifest.js (full-schema reference)

This example deliberately exercises the whole schema (select, readonly, visibleIf,
validate, derived, display, groups, custom view). For the minimal nominal case, see
the sinusoid example further down.

```js
import { float, int, select, readonly } from '../../core/fields.js';
import { view, custom, histogram, line, density, vline, hline } from '../../core/views.js';

/** @type {import('../../core/types').ExperimentManifest} */
export default {
  id: 'confidence-intervals',
  order: 6,                                     // rank inside the subject (lecture order)
  title: 'Intervalles de confiance',            // course language (French here)
  subtitle: 'Couverture fréquentiste et largeur des IC',
  tags: ['fréquentiste', 'IC', 'Student'],

  params: {
    mu:    float('μ', { description: 'moyenne vraie',       min: 0,    max: 10,  step: 0.1,  default: 5 }),
    sigma: float('σ', { description: 'écart-type',          min: 0.5,  max: 5,   step: 0.1,  default: 2 }),
    N:     int('N',   { description: "taille d'échantillon", min: 2,    max: 200, default: 30 }),
    M:     int('M',   { description: "nombre d'IC",          min: 10,   max: 100, default: 40 }),
    conf:  float('1−α', { description: 'niveau de confiance visé',
                          min: 0.80, max: 0.99, step: 0.01, default: 0.95, precision: 2 }),
    known: select('σ connue ?', { options: [
              { value: false, label: 'non — IC de Student' },
              { value: true,  label: 'oui — IC gaussien' }], default: false }),
    dof:   readonly('ν', { description: 'degrés de liberté', visibleIf: { known: false } }),
    // no seed here: injected by the core
  },
  // Factories: float, int, bool, select, log, readonly (+ seed, injected).
  //  - first positional arg = name (displayed symbol; defaults to the param key)
  //  - log: logarithmic slider — MANDATORY for any parameter spanning several
  //    orders of magnitude (SNR in dB, probabilities 1e-6…1e-1).
  //  - options, all optional except default: description, unit, min, max, step,
  //    precision, visibleIf ({param: value} or {param: [values]} — evaluated by
  //    the UI, never in views).

  validate: [
    { when: p => p.N < 2, message: 'N doit être ≥ 2' },        // course language
    { when: p => p.M * p.N > 1e7, message: 'M×N trop grand pour rester fluide' },
  ],
  // An invalid state blocks computation (not input) and shows the message.

  derived: {
    meanVariance: { label: 'σ²/N', calc: p => (p.sigma ** 2 / p.N).toFixed(3) },
  },
  // Drawer convenience quantities — simple UI-side arithmetic, never serious
  // statistics.

  groups: [
    { title: 'Modèle',          params: ['mu', 'sigma', 'known', 'dof'] },
    { title: 'Échantillonnage', params: ['N', 'M', 'conf'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults].
  // Experiments may later declare their own actions { id, label, run } —
  // extension point, no dedicated infrastructure before need.

  views: [
    // CUSTOM view: the M stacked segments fit no generic type.
    custom('realizations', 'Réalisations', () => import('./views/Realizations.svelte')),

    view('distribution', 'Distribution de x̄',
      histogram('means', {
        overlays: [
          density('theoreticalDensity', { color: '#D95319' }),
          vline('mu', { color: '#EDB120', dashed: true, label: 'μ' }),
        ],
        axes: { x: 'x̄', y: 'fréquence' },
      })),

    view('coverage', 'Couverture vs N',
      line('coverageVsN', {
        overlays: [hline(p => p.conf, { dashed: true, label: '1−α' })],
        axes: { x: 'N', y: 'couverture empirique' },
      })),
  ],
  // Factories: view(id, title, plotSpec) / custom(id, title, loader).
  // Plot & overlay factories (same factory, main or overlay by position):
  // histogram, line, scatter, bars, stem, vline, hline, density, band — first
  // arg is the observable source (or a param name / p => fn for vline/hline), flat
  // style keys (color, dashed, width, opacity, label).
  //
  // Axes: string shorthand = label with linear scale. Object form for anything
  // else: { label, scale: 'linear'|'log', unit, format, domain: [min, max] }.
  // Example (a phase-2 BER curve):
  //   axes: { x: { label: 'SNR', unit: 'dB' },
  //           y: { label: 'BER', scale: 'log', domain: [1e-6, 1] } }
  // ViewHost maps scale to core/scales.js (d3 scaleLinear/scaleLog) — log axes
  // get proper decade ticks and SI formatting for free.
  //
  // RULE: declarative first. A custom view must be justified in a comment.
  // A custom pattern repeated twice becomes a generic type in ui/plots/.
  //
  // STANDARD FIGURES are declared, not retyped. A view that IS one of the
  // catalogue's standard figures is built with the `figure` factory and NEVER
  // states a title: the id comes from core/figures.js (global, so ?view=gain
  // is the magnitude figure everywhere) and the title comes from the SUBJECT
  // (_subject.js `figures`/`figureOrder`), because the same plot is honestly
  // "Bode — gain" in automatique and "Réponse fréquentielle" in filtrage.
  // The registry enforces it both ways at load time, and `npm run check`
  // repeats the enforcement: a canonical id may not carry a hand-written
  // title, and the standard figures must appear in the subject's order.
  // An experiment whose figure is genuinely its own ("L'oscillo", "Diagramme
  // de l'œil") declares an ordinary view with its own id and its own title.
  //
  // VIEW ORDER is a convention, not a detail — a listener who moves from one
  // experiment to the next must find the same tab in the same place:
  //   signal experiment: temporal FIRST, then the spectrum, then the extras
  //   filter experiment: the signal in and out FIRST, then the impulse
  //     response, then the frequency response, then the extras
  //   control experiment: the temporal responses FIRST, then the poles,
  //     then `Bode — gain` and `Bode — phase` under those exact titles and
  //     under the ids `gain` and `phase` — every system in automatique is
  //     read the same way, and the same URL points at the same figure
  // An experiment whose subject IS another representation (spectrogram, eye
  // diagram, I/Q plane) leads with it and says so in a comment. A scene that
  // must open elsewhere declares its `view` — the tab order is the catalogue's
  // grammar, the scene's view is the lecture's.

  // No `presets` here: lecture scenes live in scenes.js, auto-discovered by the
  // registry and merged into the manifest. No `story` either (absent = reserved
  // extension point, no engine implemented).
};
```

## Contract: scenes.js — the lecture script

Separated from the manifest because it has a different edit rhythm: this is the file
reopened the night before class, and the file a colleague adapts to their own lecture
while keeping manifest and compute untouched.

```js
// experiments/estimation/confidence-intervals/scenes.js
// Auto-discovered by the registry. Defaults: view = first view, drawer = false.
export default [
  {
    id: 'scene-1', title: 'Tout va bien (N=30)',
    params: { N: 30, conf: 0.95 },
    visible: ['N', 'conf'],    // Prompt Bar pills
    masked: [],                 // black box: pill shows "?", revealHidden action
    notes: `Question à poser AVANT de bouger N :
« Si je passe N de 30 à 200, la couverture change-t-elle ? »
Réponse attendue fausse : "elle augmente". Montrer que seule la largeur diminue.`,
  },
  {
    id: 'scene-2', title: 'Niveau α = 0.20',
    params: { conf: 0.80 },
    visible: ['conf'],
    notes: `Faire compter les intervalles rouges à voix haute (~1 sur 5).`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
```

## Contract: check.js — numerical correctness harness

```js
import { compute } from './compute.js';
export const checks = [
  {
    name: 'empirical coverage ≈ 1−α (σ known)',
    category: 'statistical',       // numeric | statistical | performance
    run() {
      const { observables: o } = compute({ mu: 5, sigma: 2, N: 30, M: 10000,
                                           conf: 0.95, known: true, seed: 1 });
      return { ok: Math.abs(o.coverage - 0.95) < 0.01,
               detail: `cov=${o.coverage.toFixed(4)}` };
    },
  },
];
```

`npm run check` first runs the CATALOGUE checks — the standard-figure vocabulary
(`core/figures.js`) and the scene vocabulary (`core/scenes.js`) — then walks every
`experiments/**/check.js`, prints a ✓/✗ table grouped by category, plus each check's
execution time (performance-regression detection with no dedicated benchmark
infrastructure).

**Everything declarative is a CLOSED list, and an unknown key is an error.** Scene
keys, view builder options, figure names, param factories: a typo is caught at load
time and by `npm run check`, never silently ignored. A silently ignored `visble:` or
a `title:` left behind after a rename is the one failure mode a lecture cannot
survive, because it looks exactly like working code.
**No experiment is done without `numeric` or `statistical` checks.** UI code can be
wrong without consequence; a wrong formula projected in a lecture hall is
unacceptable.

## State & URL

Format: `#/{subject}/{experiment}?param1=…&view=…&drawer=0&preset=scene-2`
- Minimal serialization: only params ≠ default appear.
- `router.js`: single source of truth for state↔URL (bidirectional, replaceState
  while dragging, pushState on release).
- The seed is part of the state: `randomizeSeed` increments it, so the URL stays
  reproducible after every draw.
- Teacher `notes` never travel through the URL.
- **Strict casting on decode**: everything in a URL is a string; `router.js` converts
  according to the manifest type (`float` → parseFloat, `int` → parseInt, `bool` →
  `=== 'true'`, `select` → validated against `options`). An out-of-bounds or
  unparsable value **silently falls back to the default** — a hand-edited or
  truncated URL must never produce an invalid state or a crash.
- **Readable format**: multiple values comma-separated (`?v=1,2,3`), never unreadable
  `%20`/`%22` escapes. The URL is meant to be read, written on a whiteboard, and
  edited by hand.

## Generic graphic components

Shared SVG primitives: `Axes`, `Histogram`, `Line`, `Scatter`, `Bars`, `Stem`
(stalk + marker from a baseline — the discrete-signal plot: sampled signals,
filter coefficients, impulse responses, line spectra; never a continuous line,
which would claim values between the samples) + overlays
`VLine`, `HLine`, `Density`, `Band`. All accept ready-made observables and style
options; none computes anything scientific. `ViewHost` interprets
`{layout, plot, overlays}` and composes these primitives.

**Scales (`core/scales.js`).** A thin wrapper re-exporting the project's configured
d3 primitives: `scaleLinear`, `scaleLog` (phase-2 SNR), `ticks`, `bin`, `line`/`area`
path generators, and a `format` preset (SI units, fixed precision). All `ui/plots/`
primitives AND custom views import from THIS module, never from d3 directly — one
import point, one place to configure defaults, and pixel scaling remains the only
"computation" allowed in a view.

## Lecture guard — live robustness

A slider pushed to an extreme in front of 200 students must never freeze the screen
or crash the app. The `worker-host` applies three protections:

1. **Computation status.** Any task exceeding ~100 ms switches the statline to
   `status: 'computing'` (discreet indicator, no full-screen spinner); the last valid
   result stays displayed meanwhile.
2. **Timeout and resurrection.** Beyond 1.5 s, the worker-host kills the worker
   (`worker.terminate()`), spawns a clean one, restores the last valid params and
   shows in the statline: `⚠ Computation aborted — values too large`. The lecture
   goes on; the manifest's `validate` rules remain the first line of defense (M×N
   bounds), the timeout is the safety net.
3. **Graceful errors.** `compute.worker.js` wraps every compute execution in a
   generic try/catch: any exception (division by zero, invalid bounds in a custom
   compute) surfaces as `status: 'error'` and renders `⚠ Computation error` on the
   PlotFrame — never a silent crash, never a white screen.

## Canonical minimal experiment: the sinusoid

The floor of the contract — a complete experiment in ~90 lines, four files, zero UI
code. This is the reference for the README, the "write your experiment in 30 minutes"
tutorial, and the scaffold templates. Every remaining line is a decision.

```js
// experiments/signal/sinusoid/manifest.js
// Core defaults apply: seed injected, default actions, single flat group,
// scenes.js auto-discovered, layout 'plot' implied.
import { float } from '../../core/fields.js';
import { view, line } from '../../core/views.js';

/** @type {import('../../core/types').ExperimentManifest} */
export default {
  id: 'sinusoid',
  random: true,                                 // it draws: σ·bruit, so it gets a seed
  title: 'La sinusoïde',
  subtitle: 'Amplitude, fréquence, phase — et un peu de bruit',
  tags: ['signal', 'sinusoïde', 'fondamentaux'],

  params: {
    A:     float('A', { description: 'amplitude', min: 0,     max: 2,    step: 0.05, default: 1 }),
    f:     float('f', { description: 'fréquence', min: 0.5,   max: 20,   step: 0.1,  default: 3,
                        unit: 'Hz', precision: 1 }),
    phi:   float('φ', { description: 'phase',     min: -3.14, max: 3.14, step: 0.01, default: 0,
                        unit: 'rad', precision: 2 }),
    sigma: float('σ', { description: 'bruit',     min: 0,     max: 1,    step: 0.02, default: 0 }),
  },

  views: [
    view('time', 'Temporel',
      line('noisy', {
        overlays: [line('clean', { color: '#D95319', width: 2 })],
        axes: { x: { label: 't', unit: 's' }, y: 'x(t)' },
      })),
  ],
};
```

```js
// experiments/signal/sinusoid/scenes.js
export default [
  {
    id: 'phase', title: 'Scène 1 · La phase, ça décale',
    params: { A: 1, f: 3, phi: 0, sigma: 0 },
    visible: ['phi'],
    notes: `Un seul potard : φ. Geler (F) à φ=0, puis tourner.
Question : « φ = π/2, j'obtiens quelle courbe connue ? »
Le fantôme gris montre le sinus d'origine, le cosinus se superpose.`,
  },
  {
    id: 'noise', title: 'Scène 2 · Le signal dans le bruit',
    params: { A: 1, f: 3, phi: 0, sigma: 0.5 },
    visible: ['sigma', 'A'],
    notes: `Marteler R : le bruit change, la sinusoïde rouge reste.
Monter σ jusqu'à ce que l'œil perde le signal (~σ = A).
Teaser : « et pourtant, on peut retrouver A, f, φ exactement —
c'est tout le programme du semestre. »`,
  },
];
```

```js
// experiments/signal/sinusoid/compute.js
import { mulberry32, gaussFrom } from '../../core/rng.js';

const FS = 200;   // sampling rate (Hz)
const T = 2;      // duration (s)

/** PURE, stateless, seeded. `seed` is injected by the core because the
 *  manifest declares `random: true`. */
export function compute({ A, f, phi, sigma, seed }) {
  const gauss = gaussFrom(mulberry32(seed));
  const n = FS * T;
  const t = new Float64Array(n);
  const clean = new Float64Array(n);
  const noisy = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    t[i] = i / FS;
    clean[i] = A * Math.sin(2 * Math.PI * f * t[i] + phi);
    noisy[i] = clean[i] + sigma * gauss();
  }

  return {
    observables: {
      clean: { x: t, y: clean },
      noisy: { x: t, y: noisy },
      snrDb: {
        value: sigma > 0 ? 10 * Math.log10((A * A / 2) / (sigma * sigma)) : Infinity,
        meta: { label: 'SNR', unit: 'dB', precision: 1 },
      },
    },
  };
}
```

```js
// experiments/signal/sinusoid/check.js
import { compute } from './compute.js';
import { standardChecks } from '../../core/checks.js';

export const checks = [
  {
    name: 'clean sinusoid: exact value at known points',
    category: 'numeric',
    run() {
      const { observables: o } = compute({ A: 2, f: 1, phi: 0, sigma: 0, seed: 1 });
      // f=1 Hz, FS=200: sample 50 is t=0.25 s → sin(π/2) → A
      const v = o.clean.y[50];
      return { ok: Math.abs(v - 2) < 1e-12, detail: `x(0.25)=${v}` };
    },
  },
  {
    name: 'noise power ≈ σ² (large-sample)',
    category: 'statistical',
    run() {
      const { observables: o } = compute({ A: 0, f: 1, phi: 0, sigma: 0.7, seed: 2 });
      const y = o.noisy.y;
      const p = y.reduce((a, b) => a + b * b, 0) / y.length;
      return { ok: Math.abs(p - 0.49) < 0.05, detail: `power=${p.toFixed(4)}` };
    },
  },
  standardChecks.determinism(compute,
    { A: 1, f: 3, phi: 1, sigma: 0.5, seed: 7 }, 'noisy'),
];
// Note for deterministic signals: assert exact known values (1e-12), not
// statistical tolerances — those are for stochastic observables only.
```

## Scaffold

`npm run new:experiment` (interactive Node script, ~100 lines, no heavy deps):
1. Questions: subject (existing + "new"), id, title, template.
2. Templates: `monte-carlo` (M/N/seed params, wired histogram view) and
   `parametric-curve` (parameter sweep, line view).
3. Writes the four files: a pre-filled `manifest.js` (params, declarative view),
   a `scenes.js` with one example scene (pills + notes), a `compute.js` returning
   functional dummy observables, and a `check.js` that includes the mandatory
   `standardChecks.determinism` plus one trivial passing test.
4. **Criterion: the experiment appears in the sidebar and runs immediately**, before
   any domain code. The scaffold modifies no existing file.

`npm run new:subject`: creates the directory + `_subject.js`.

---

# 5. Implementation

## Stack

- **Svelte 5** (runes: `$state`, `$derived`, `$effect`) + **Vite**. No SvelteKit
  (pure static, hash routing suffices).
- **d3 (math & layout modules) + SVG rendered by Svelte** — the standard d3+Svelte
  integration pattern: d3 computes (scales, ticks, path strings, formats,
  histogram bins), Svelte renders the SVG from state. Assumed modules: `d3-scale`,
  `d3-array`, `d3-shape`, `d3-format`, `d3-interpolate` — imported piecemeal, never
  the full `d3` bundle. `d3-selection` (and any DOM-manipulating module) is not
  used: Svelte owns the DOM, and both the freeze-frame snapshot and SVG export rely
  on the SVG being a pure function of state. No high-level charting library
  (Plotly, ECharts…) on top.
- **Web Workers**: a generic worker dynamically imports the requested `compute.js`;
  30 Hz throttling while dragging.
- Typed JSDoc on the contracts.
- Type: IBM Plex Sans (UI) / IBM Plex Mono (data). System fallback.
- **MATLAB plot palette**: `#0072BD`, `#D95319`, `#EDB120`, `#7E2F8E`, `#77AC30`
  — reserved for data marks inside plots.
- **UI chrome: shadcn/ui design language.** Neutral white/black/zinc palette
  only (shadcn zinc tokens: background/foreground, muted `#f4f4f5`/`#71717a`,
  border `#e4e4e7`, primary `#18181b`; dark equivalents). Outline buttons with
  subtle shadow, primary action in near-black, lucide-style inline SVG icons —
  no emojis in the chrome, no color accent. The UI must read as an Open WebUI /
  shadcn application.

## Directory layout

```
/
├── CLAUDE.md
├── package.json
├── vite.config.js
├── scripts/
│   └── new-experiment.js
├── src/
│   ├── main.js
│   ├── App.svelte
│   ├── core/
│   │   ├── registry.js           # glob over manifests + scenes, applies core defaults
│   │   ├── router.js             # hash routing + strict-cast state↔URL
│   │   ├── store.svelte.js       # global reactive state (runes)
│   │   ├── rng.js                # mulberry32 — the ONLY allowed generator
│   │   ├── numeric.js            # shared pure math (normalPdf, erf, quantiles,
│   │   │                         #   Student t, trapz, small linear solver) —
│   │   │                         #   importable from compute.js and check.js
│   │   ├── laws.js               # canonical sampling laws (draw + exact moments)
│   │   ├── prefs.js              # cosmetic localStorage prefs (single owner)
│   │   ├── actions.js            # core action registry
│   │   ├── observables.js        # type inference + meta
│   │   ├── scales.js             # thin wrapper over d3-scale/array/shape/format
│   │   ├── fields.js             # field factories (float, int, select…) + load-time validation
│   │   ├── views.js              # view/plot/overlay factories + load-time validation
│   │   ├── figures.js            # the catalogue's STANDARD FIGURES: global
│   │   │                         #   ids, per-subject titles and order, and
│   │   │                         #   the guard that makes drift impossible
│   │   ├── scenes.js             # the SCENE vocabulary and its validation:
│   │   │                         #   closed key list, types, and the view and
│   │   │                         #   param references a scene makes
│   │   ├── response-views.js     # the FIGURES a response experiment draws,
│   │   │                         #   shared across analog, digital and control:
│   │   │                         #   gainView/phaseView (a Bode plot IS a
│   │   │                         #   réponse fréquentielle with another
│   │   │                         #   abscissa), polesView, timeView,
│   │   │                         #   impulseView, spectrumView
│   │   ├── checks.js             # standardChecks factories (determinism…)
│   │   ├── strings.js            # all core UI strings (English constants)
│   │   ├── worker-host.js        # worker + 30 Hz throttle + lecture guard
│   │   └── compute.worker.js
│   ├── ui/
│   │   ├── Sidebar.svelte
│   │   ├── CommandPalette.svelte
│   │   ├── Header.svelte         # breadcrumb + preset selector + actions
│   │   ├── Workspace.svelte      # composes: TeacherBanner, Tabs, ViewHost,
│   │   │                         #   PlotFrame, PromptBar
│   │   ├── DrawerParams.svelte
│   │   ├── Inspector.svelte      # developer panel (raw observables)
│   │   └── plots/
│   └── experiments/              # one directory per subject; the directory
│       ├── estimation/           #   name IS the first URL segment, so a
│       │   ├── _subject.js       #   subject stays small enough to be scanned
│       │   │                     #   { title, order, figures, figureOrder }
│       │   ├── _lib/             #   the subject's OWN shared code, when it
│       │   │                     #   has any: control/_lib/{bode,lti}.js,
│       │   │                     #   filtering/_lib/bench.js,
│       │   │                     #   comm/_lib/{codes,modulation}.js,
│       │   │                     #   stats/_lib/laws.js
│       │   └── confidence-intervals/
│       │       ├── manifest.js   # definition (stable)
│       │       ├── scenes.js     # lecture script (edited before each class)
│       │       ├── compute.js    # the science
│       │       ├── check.js      # the harness
│       │       └── views/        # custom views only
│       ├── stats/ estimation/ regression/ detection/
│       ├── analog/ conversion/ spectral/ filtering/
│       └── comm/ control/ numerics/
└── tests/                        # optional — the main harness is check.js
```

## Conventions

- **Code, UI chrome, comments, commit messages: English.** Pedagogical content
  (labels, titles, notes, validation messages) lives in manifests, in the course
  language.
- Commits: prefixes `core:`, `exp(confidence-intervals):`, `ui:`, `scaffold:`,
  `check:`.
- After any new experiment or compute change: `npm run check`.
- **Declarative first**; custom justified in a comment; repeated pattern → promoted.
- **Never a modal for parameters**; non-modal popovers, plot always visible.
- No runtime dependency without written justification in the commit (light, durable
  bundle). Assumed dependencies: Svelte, and the d3 math/layout modules listed in
  the Stack section — always imported piecemeal (`import { scaleLinear } from
  'd3-scale'`), never the full `d3` bundle, and always consumed through
  `core/scales.js`. `d3-selection` and any DOM-manipulating d3 module remain
  excluded: Svelte owns the DOM (freeze-frame and SVG export depend on it).
- localStorage: cosmetic preferences only (theme, sidebar, teacher mode) — never
  experiment state, which lives in the URL.
- Responsive (sidebar as mobile drawer, adapted Prompt Bar); baseline accessibility
  (visible focus, `prefers-reduced-motion`, AA contrast).

## Development phases

1. **Core + chatbot UX**: full core (registry, router with strict casting, store,
   rng, actions, observables, scales, worker-host with **lecture guard**: status,
   1.5 s timeout + resurrection, try/catch), Sidebar, Header with preset selector,
   Workspace (Tabs, ViewHost, PlotFrame, PromptBar with non-modal popovers and
   actions, TeacherBanner), generated DrawerParams (visibleIf, validate, derived,
   display), generic plots + overlays. Full validation on
   `estimation/confidence-intervals`.
2. **Trial by fire**: `detection/neyman-pearson` (`log` param for SNR,
   densities+threshold / ROC / Pd vs SNR) to stress-test and **lock the manifest
   schema**. No other experiment before this lock.
3. **Lecture polish**: CommandPalette, full shortcuts, Presentation Mode, Teacher
   Mode, **freeze frame (F)**, Inspector, exports (SVG, PNG, clipboard), scaffold.
4. **Catalog**: histogram/density, LLN-CLT, bias/variance, MLE, CRB vs MLE, then
   digital communications.
5. **Extension points** (nothing implemented before a concrete need — principle 7):
   story engine (lead: state machine whose transitions trigger
   animation/panel/note/view change), incremental `step()` contract + recorders
   (continuous drawing, LMS, PLL, Kalman), WebRTC remote control (PeerJS),
   QR-code prediction voting, **MIDI CC mapping of visible pills (Web MIDI API:
   scene presets map pills to fixed CCs — no MIDI-learn needed; soft takeover for
   absolute encoders; buttons bound to actions randomizeSeed/freeze/prev-next
   preset; Launch Control XL as reference device; Chrome/Edge only, fine for
   projection)**, parameter animations, sharedState between side-by-side
   views, a Figure abstraction if layouts prove insufficient, annotation overlay,
   config timeline, CSV/JSON export, compute cache, experiment-defined actions.
