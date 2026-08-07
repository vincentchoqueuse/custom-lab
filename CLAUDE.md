# pupitra — a scientific demonstration engine for teaching

*(pupitra, from the French **pupitre** — the lectern: not a course companion,
the professor's bench, which is the whole vision in one word. The default seed
stays 34, a surviving nod to the GR 34 — the Breton coastal trail of many
short well-marked stages, walked one at a time and always in the same order —
that the project was first named after.)*

Document organized from durable to interchangeable:
**Vision → Concepts → UX → Architecture → Implementation.**

---

# 1. Vision

A **purely static** web application (no server, deployable on any static host) that serves as a
**live demonstration instrument for lecture halls**: a catalog of interactive
experiments (statistics, estimation, detection, digital communications) that are
scriptable, projectable, and drivable. Not a course companion — the professor's bench.

Project identity: **static, reproducible, declarative, centered on pedagogical
staging rather than parameter editing.**

## Three roles, and the instrument holds exactly one

**The instrument shows the PHENOMENON. The board carries the REASONING. The
student writes the IMPLEMENTATION.** Each of the three loses its value if
another does it in its place — and the one this project must not take is the
third. A demonstration that displayed its own numpy would hand over the answer
to the lab exercise that follows it; the room would watch a solution instead of
meeting a problem.

So the implementation is deliberately NOT on screen. There is no code panel, no
notebook cell, no "show the source" button on the plot — not an omission, a
boundary. Two rules already in this document follow from it rather than from
taste:

- **The doc tells the story; the scenes stage it.** The manifest's `doc` is
  public prose distilling what the scenes demonstrate, measured numbers
  included. It absorbed the per-scene teacher notes, and the private channel
  (Teacher Mode) was removed with nothing left to carry.
- **The info panel's source link is provenance, not a handout.** It opens the
  experiment's directory on GitHub — compute.js for a colleague verifying a
  formula, scenes.js for one adapting the script to their own lecture. It is
  also, always, the correction of whatever exercise comes next — which is why
  it sits one click inside a dialog and never on the view bar that gets
  projected.

It is also why the science stays in JavaScript. Python belongs to the students,
and a Pyodide compute would put their work on the wall — quite apart from
trading 296 kB of gzip for twenty megabytes and making the lecture guard's
worker resurrection cost seconds instead of milliseconds.

## Non-negotiable principles

1. **Fully static.** Everything runs in the browser. No backend, no API. A
   deployment may carry the whole catalogue or A SINGLE SUBJECT:
   `PUPITRA_SUBJECT=control npm run build` rewrites the four glob patterns at
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
6. **AGPL-3.0. Everything in English — code, UI, commits, and pedagogical content
   alike.** One language, no i18n framework: labels become `{fr, en}` pairs the day
   a second language is added, which would break the manifest contract and double
   the maintenance of every doc paragraph forever. The catalogue is a demonstration
   instrument for an international audience; the lecture may be given in any
   language, the instrument speaks one. Core UI strings live in
   `src/core/strings.js`; the catalogue's own vocabulary — the word chosen, once,
   for each recurring quantity — lives in `TERMINOLOGY.md` and is a closed list.
   (A per-language build, resolved at build time like `PUPITRA_SUBJECT`, remains an
   extension point per principle 7. Nothing before a concrete need.)
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
params (black box), panel states. Presets chain via keyboard (←/→): the preset
list IS the lecture script; the argument it stages is written up in the
manifest's `doc`.

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
- ✓ have multiple presets/scenes, and a doc that tells their story
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
and the chrome — Parameters, Draw, Presets, Search… — in English, like everything else.)

## Interface components

**Left sidebar (Open WebUI style).** Theme-aware neutral (`#f9f9f9` light /
`#171717` dark), ~260 px, collapsible (`⌘B`), rounded items, soft gray hover,
active item in neutral gray (never a color accent). Top button: "Search
experiments" (`⌘K`). Tree: subjects (small muted sentence-case labels
behind a folder glyph — shut when folded, open when not — carrying their
experiment count in parentheses, collapsible, with a hover-only ± on the
right) → experiments, indented under their folder. The count is the one thing
a shut folder cannot say for itself, and it is set one weight and one shade
below the title: the eye reads the modules first and finds the numbers only
when it is looking for them.
Footer: light/dark theme toggle for the central area, the source link, settings,
inspector.

**Clean header.** Breadcrumb `Subject / Experiment`. **Central preset selector**,
LLM-model-picker style — one click applies the full scene. Right side: copyable URL
chip, QR code, and the EMBED MINT — one click copies a ready-to-paste iframe of
the current scene (`loading="lazy"` baked in). It took the fullscreen button's
slot: striking an embed is a minting gesture that deserves a button, while
presentation mode is a lecture gesture that lives on its key (`L`).

**Landing page (`#/`).** The catalogue introducing itself: name, one-sentence
identity with the experiment/module/scene counts (computed from the registry at
runtime — nothing on the page can go stale), the check.js promise with a repo
link, and the modules as cards in lecture order, every experiment a link. **The
first gesture is a search bar**, chatbot-style: the page lands with the caret
already in it (not on a phone, where autofocus pops the keyboard), typing swaps
the module grid for the hits, ↑/↓ and Enter open one, Escape restores the grid.
It is the ⌘K palette's filter — one implementation in `core/registry.js` —
worn as a hero input instead of an overlay. The single-letter shortcuts are
inert here — there is no experiment for them to drive — and the header shows no
presentation button; ⌘K and the sidebar work as everywhere.

**Central area.** Light-background PlotFrame (projector legibility), pure SVG
rendering, statline of key observables, export. Minimal tabs when the experiment has several
views.

**View bar (tabs line).** The representations on the left when the experiment has
several — a segmented control on a desktop or a projector, where the room should see
that there ARE four readings before any is opened, and a NATIVE `<select>` below
860 px, because six tabs the length of "Impulse response" do not fit a phone.
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
| `I` | Open / hide the **I**nfo panel (what this experiment is) | **I**nfo |
| `P` | Open / hide the parameter Drawer | **P**arameters |
| `R` | `randomizeSeed` action (draw again) | **R**andomize |
| `F` | `freeze` action — freeze/unfreeze the plot for before/after comparison (phase 3) | **F**reeze |
| `A` | Lock / unlock the plot axes (the frame stays put while the curve moves) | **A**xes |
| `C` | Switch the **C**rosshair readout on / off (also a button in the statline) | **C**ursor |
| `L` | **L**ecture Presentation Mode: **fullscreen** (Fullscreen API) + strokes ×1.6 + type ×1.3 + minimal chrome | **L**ecture |
| `←` / `→` | Previous / next preset (the lecture script on keys) | — |
| `Esc` | Exit fullscreen / close the info panel / clear freeze ghost / close popover or palette / show hidden series | — |

Rules: single-letter shortcuts are inert while a text field has focus; fullscreen uses
the browser Fullscreen API (native `Esc` exit).

## Display modes

- **Prompt Bar**: always visible; `masked` → the pill shows "?" (black box),
  `revealHidden` action to unveil.
- **Drawer**: closed by default, state in the URL, controllable per preset.
- **Info panel** (`I`): a wide dialog describing the experiment — its `doc` in
  prose, the LECTURE OUTLINE (every scene title, the current one marked, each a
  button that plays it), the tags, and the attribution. The footer's provenance line ends with a deep link
  to **this experiment's directory on GitHub**, on the deployed branch: the
  sidebar's repository button answers "what is this project"; this one answers
  both "how is that computed" (compute.js) and "how would I build one" — the
  four-file listing is the architecture's own sales pitch, and GitHub renders
  it better than any panel could. It is in the footer and not in the view bar
  because reading the source is not a lecture gesture and the view bar is
  projected. The link is built from the subject and the id rather than from
  anything a manifest declares, so `npm run check` guards it: an experiment
  missing any of its four files fails the catalogue checks, since a link that
  under-delivers on its own tooltip is the one breakage a reader cannot
  diagnose. It replaced a banner that sat above the plot on
  every scene of every lecture: three lines of permanent height for text read
  once, and no room at all for a description of the experiment itself. A dialog
  does not contradict "never a modal for parameters" — that rule protects the
  look→adjust→look loop, and nothing here adjusts anything.
- **Presentation Mode** (`L`): readable from the back of a lecture hall.
- **Freeze frame** (`F`, `freeze` action): the current plot is pinned as a **gray
  dashed ghost in the background**; any subsequent change (slider, draw) renders on
  top in color. The pedagogical sequence question → prediction → observation →
  explanation becomes one gesture: freeze, ask, move, compare. Re-freezing replaces
  the ghost; `Esc` or `F` again clears it. Universal implementation: snapshot of the
  rendered SVG (grayed DOM clone under the plot), which works for any view —
  declarative or custom — without touching views or compute. The ghost is display
  state, NOT in the URL (not link-reproducible, by design). **The statline
  freezes with it**: while a ghost exists every reading shows `coverage =
  0.948 → 0.812`, the frozen value muted before the current one, and only where
  the two DIFFER as displayed — comparing the formatted strings, so a change
  below a reading's own precision does not put an arrow between two identical
  numbers. A frozen picture answers "has the shape changed"; the room's next
  question is always "by how much", and the old number used to be gone the
  instant the slider moved.
- **Crosshair readout** (`C`, or the Cursor button in the statline): OFF until
  asked for. Pointer-only and always-on, it was invisible — nothing said it
  existed, it does nothing on a plane or in a custom view, and it ignored touch:
  three different ways to look broken. The switch says the feature is there and
  whether it is on; it is offered only on the views that can honour it; and
  because it is the reader ASKING, a finger is tracked too — capturing touch
  costs the page its scroll over the plot, which is a fair trade for somebody
  who wants the readout and no trade at all for somebody who does not. The
  preference persists (localStorage, cosmetic). Pointing at a declarative plot draws a rule at the
  sample under the pointer, a dot on every visible series and its value beside
  it, with the abscissa on the axis. "And at 3 Hz, what is it?" is the question
  a room asks most often about a curve, and reading it off pixels was the only
  answer available. The rule SNAPS to the sample it reads — rule, dots and
  abscissa are then one place instead of three — which on a dense curve is
  invisible and on a stem plot of 24 symbols is the truth: a sampled signal has
  no value between two samples. A stack draws ONE rule through all its panels
  at one instant, which is what makes reading Re and Im straight down a
  reading rather than two. Mouse and pen only: tracking a finger needs
  `touch-action: none` over most of a phone screen, and the page would stop
  scrolling under the reader's thumb. Purely transient — it lives while the
  pointer is over the frame, so it is in neither the URL nor the `Esc` chain —
  and marked `data-transient`, which the SVG export and the freeze ghost strip
  from their clones, because `F` fires perfectly happily while the pointer sits
  on the curve. Equal-aspect planes and custom views do not carry it: a
  vertical rule answers a different question on a plane.
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
  title, or the view takes an id of its own.** A pole map called "Pole map"
  while every other one says "Poles and zeros" is a load-time error, not a
  thing to notice in class.
- **`order` ranks the experiment inside its subject** — the lecture progression, not
  the alphabet: the sidebar and the palette read a subject in the order the course
  meets its demos. Absent → the experiment lands at the end of its subject,
  alphabetically, so adding one still modifies nothing else (principle 4).
  `_subject.js` carries the same key for the subjects themselves.
- **`scenes.js` is auto-discovered** by the registry (same glob as manifests) and
  merged as `presets`. In a scene: `view` defaults to the first view, `drawer` to
  `false`, `masked` to `[]`, `lock` to `false`. **`visible` holds 2 to 4 pills,
  and one is a load-time error**: a single pill is a slider, not a scene — the
  room can turn it but cannot COMPARE, and comparison is what a demonstration
  is for. A scene that honestly moves one dial still exposes the quantity the
  room will suspect of doing the work, so that holding it still reads as a
  choice. Past four the bar stops being legible from the back of a hall; the
  drawer is for the rest. **Past two views the default
  stops applying**: a scene of an experiment with three or more views must SAY
  which one it opens on, and the registry refuses one that does not. The default
  is a convention for a main figure and its companion; on four tabs it means the
  scene silently follows any reordering and opens on a figure its title does not
  describe.
- **`story`** absent → reserved extension point (state-machine lead noted in phase 5).
- **Params are declared with field factories** from `core/fields.js` (Django-style):
  `float`, `int`, `bool`, `select`, `log`, `readonly`. Factories return the plain
  param objects the registry consumes, **validate at load time** (min < max, default
  within bounds, select default present in options, sane step) and **throw named
  errors** — a typo fails at first `npm run dev`, never silently in class.
  **Three separate semantic keys, never concatenated in one string**:
  `name` — the displayed symbol ('f', 'φ', 'N'; first positional argument, defaults
  to the param key); `description` — what it is ('frequency', 'phase'); `unit` —
  'Hz', 'rad', 'dB'. A `select` option's `label` renders VERBATIM in the pill, so
  two lengths are capped at load time: the label at **24 characters** and the
  rendered pill `name = label` at **30**. The gloss belongs to `description`,
  which the drawer and the tooltip show, or to the manifest `doc`. Rendering: pills show `name = value unit`; the drawer shows
  the name with the description as secondary text; the description also feeds the
  tooltip. Every param has a `default` (no nullable fields: the URL contract and
  resetDefaults require it); every other key is optional.
- **Views are declared with factories** from `core/views.js`, mirroring the field
  factories: `view(id, title, plotSpec)`, `custom(id, title, loader)`, and one
  factory per graphic type — `histogram`, `line`, `scatter`, `bars`, `stem`, `vline`,
  `hline`, `density`, `band`. The same factory works as main plot or as overlay,
  by position, plus the two shapes a single cartesian plot cannot express:
  `plane(id, title, spec)` for equal aspect (I/Q, s- and z-planes: circles must
  stay circles) and `stack(id, title, panels, {axes, overlays})` for panels over
  one shared abscissa — a COMPLEX signal in time, Re above and Im below, which
  is not two curves but two components of one. The stack declares the abscissa
  once, and the overlays that mark it (a frame boundary, a prefix band) are
  drawn on every panel, because they name a place in time and not a place in
  one of the two parts; each panel declares its own `axes.y` and may not declare
  an `axes.x`. Style keys are **flat** (`color`, `dashed`, `width` — no nested
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
  title: 'Confidence intervals',
  subtitle: 'Frequentist coverage and the width of the interval',
  tags: ['frequentist', 'interval', 'Student'],
  doc: `What the experiment is, in prose, for the info panel (I). Optional:
        absent, the panel stands on the subtitle, the tags and the lecture
        outline, which every experiment has by construction — an empty
        description is better than an invented one. Paragraphs are separated by
        a blank line and reflow to the reader's width.`,
  // author: 'A. Colleague',   // only where it is not the catalogue's own
  // date:   '2026-02',        // only where a date says something

  params: {
    mu:    float('μ', { description: 'true mean',           min: 0,    max: 10,  step: 0.1,  default: 5 }),
    sigma: float('σ', { description: 'standard deviation',  min: 0.5,  max: 5,   step: 0.1,  default: 2 }),
    N:     int('N',   { description: 'sample size',         min: 2,    max: 200, default: 30 }),
    M:     int('M',   { description: 'number of intervals', min: 10,   max: 100, default: 40 }),
    conf:  float('1−α', { description: 'target confidence level',
                          min: 0.80, max: 0.99, step: 0.01, default: 0.95, precision: 2 }),
    known: select('σ known?', { options: [
              { value: false, label: 'no — Student interval' },
              { value: true,  label: 'yes — Gaussian interval' }], default: false }),
    dof:   readonly('ν', { description: 'degrees of freedom', visibleIf: { known: false } }),
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
    { when: p => p.N < 2, message: 'N must be ≥ 2' },
    { when: p => p.M * p.N > 1e7, message: 'M×N too large to stay responsive' },
  ],
  // An invalid state blocks computation (not input) and shows the message.

  derived: {
    meanVariance: { label: 'σ²/N', calc: p => (p.sigma ** 2 / p.N).toFixed(3) },
  },
  // Drawer convenience quantities — simple UI-side arithmetic, never serious
  // statistics.

  groups: [
    { title: 'Model',           params: ['mu', 'sigma', 'known', 'dof'] },
    { title: 'Sampling',        params: ['N', 'M', 'conf'] },
  ],

  // actions omitted → core default [randomizeSeed, freeze, resetDefaults].
  // Experiments may later declare their own actions { id, label, run } —
  // extension point, no dedicated infrastructure before need.

  views: [
    // CUSTOM view: the M stacked segments fit no generic type.
    custom('realizations', 'Realizations', () => import('./views/Realizations.svelte')),

    view('distribution', 'Distribution of x̄',
      histogram('means', {
        overlays: [
          density('theoreticalDensity', { color: '#D95319' }),
          vline('mu', { color: '#EDB120', dashed: true, label: 'μ' }),
        ],
        axes: { x: 'x̄', y: 'frequency' },
      })),

    view('coverage', 'Coverage vs N',
      line('coverageVsN', {
        overlays: [hline(p => p.conf, { dashed: true, label: '1−α' })],
        axes: { x: 'N', y: 'empirical coverage' },
      })),
  ],
  // Factories: view(id, title, plotSpec) / custom(id, title, loader) /
  // plane(id, title, spec) / stack(id, title, panels, {axes, overlays}).
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
  // "Bode — gain" in control and "Frequency response" in filtering.
  // The registry enforces it both ways at load time, and `npm run check`
  // repeats the enforcement: a canonical id may not carry a hand-written
  // title, and the standard figures must appear in the subject's order.
  // An experiment whose figure is genuinely its own ("The scope", "Eye
  // diagram") declares an ordinary view with its own id and its own title.
  //
  // VIEW ORDER is a convention, not a detail — a listener who moves from one
  // experiment to the next must find the same tab in the same place:
  //   signal experiment: temporal FIRST, then the spectrum, then the extras
  //   filter experiment: the signal in and out FIRST, then the impulse
  //     response, then the frequency response, then the extras
  //   control experiment: the temporal responses FIRST, then the poles,
  //     then `Bode — gain` and `Bode — phase` under those exact titles and
  //     under the ids `gain` and `phase` — every system in control is
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
// A scene carries no prose: the argument the scenes stage is written up once,
// publicly, in the manifest's `doc`.
export default [
  {
    id: 'scene-1', title: 'All is well (N=30)',
    params: { N: 30, conf: 0.95 },
    visible: ['N', 'conf'],    // Prompt Bar pills
    masked: [],                 // black box: pill shows "?", revealHidden action
  },
  {
    id: 'scene-2', title: 'Level α = 0.20',
    params: { conf: 0.80 },
    visible: ['conf'],
  },
];
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
- **`#/` is the catalogue's landing page** — the modules in lecture order, the
  live counts (read from the registry, never written by hand), and the
  verification promise. An UNKNOWN path lands there too: the honest fallback
  for a broken shared link is the catalogue choosing nothing, not the first
  experiment chosen arbitrarily. The sidebar brand links home.
- **`embed=1` renders the instrument chrome-less for an iframe** in a course
  page: no sidebar, header, drawer or panel toggles — the tabs, plot, actions
  and pills stay, plus one quiet "pupitra" chip that opens the same scene in the
  full catalogue (the adoption loop: a colleague embeds ONE live figure in
  their LMS, and every embed is a door back). It rides the query like `drawer`
  so it survives the hash rewrites that pill drags produce; panel shortcuts
  (I, P, L, ⌘K/⌘B) are inert inside it, plot gestures (R, F, C, A, ←/→) keep
  working — but no kbd hint is shown: the chips are the full app teaching its
  own vocabulary, clutter inside someone else's page (same rule as the phone).
- Minimal serialization: only params ≠ default appear.
- `router.js`: single source of truth for state↔URL (bidirectional, replaceState
  while dragging, pushState on release).
- The seed is part of the state: `randomizeSeed` increments it, so the URL stays
  reproducible after every draw.
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
options; none computes anything scientific. A `PlotPanel` composes them into one
framed set of axes; `DeclarativePlot` is a canvas holding a single panel and
`StackPlot` a canvas holding several over ONE abscissa, computed from every
panel's layers before any is drawn (`ui/plots/layers.js`) — panels that each
scaled their own x would line up by accident. `ViewHost` interprets
`{layout, plot, overlays}` and composes these primitives.

**Two canvases (`ui/plots/frame.js`).** The plot canvas is 16:9 and 760 units
wide on a desktop or a projector, and 4:3 and 460 units wide below the mobile
breakpoint — the same breakpoint at which the sidebar becomes a drawer and the
tabs become a native picker. NOT portrait, deliberately: a frame taller than it
is wide would fill the phone and would also make a sinusoid look steep, and the
promise of the instrument is that a figure teaches the same thing in the hand
and on the wall. The narrow canvas is also SMALLER IN USER UNITS, which is the
part that carries: both render at the same physical width, so the same 12 px
label lands at 5.7 real pixels through the wide canvas and 9.4 through the
narrow one — the type did not grow, the ruler shrank. Which one is in force is
`app.ui.narrow`, a viewport FACT kept by one matchMedia listener in `App.svelte`
(never in localStorage, never in the URL); it reaches every renderer through
`frameFor()` and every custom view as a `frame` PROP, because a custom view must
not have to know the store to draw on the same frame as everything else. A view
that renders `<Axes>` hands it the margin it drew with (`m={M}`) — the axis
names are placed inside that margin, and `npm run check` fails a view that
forgets, since the symptom appears on a phone only.

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
  random: true,                                 // it draws: σ·noise, so it gets a seed
  title: 'The sinusoid',
  subtitle: 'Amplitude, frequency, phase — and a little noise',
  tags: ['signal', 'sinusoid', 'fundamentals'],

  doc: `Three numbers and a curve: A scales it, f packs it, φ slides it — at
φ = π/2 the sine is a cosine, which the freeze ghost demonstrates in one
gesture. Adding noise hides the curve without touching it: redraw and the
noise changes while the red sinusoid stays put, and around σ = A the eye
loses a signal that is still exactly there — recoverable, which is the whole
point of the semester.`,

  params: {
    A:     float('A', { description: 'amplitude', min: 0,     max: 2,    step: 0.05, default: 1 }),
    f:     float('f', { description: 'frequency', min: 0.5,   max: 20,   step: 0.1,  default: 3,
                        unit: 'Hz', precision: 1 }),
    phi:   float('φ', { description: 'phase',     min: -3.14, max: 3.14, step: 0.01, default: 0,
                        unit: 'rad', precision: 2 }),
    sigma: float('σ', { description: 'noise',     min: 0,     max: 1,    step: 0.02, default: 0 }),
  },

  views: [
    view('time', 'Time signal',
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
    id: 'phase', title: 'Scene 1 · Phase shifts the curve',
    params: { A: 1, f: 3, phi: 0, sigma: 0 },
    visible: ['phi'],
  },
  {
    id: 'noise', title: 'Scene 2 · The signal inside the noise',
    params: { A: 1, f: 3, phi: 0, sigma: 0.5 },
    visible: ['sigma', 'A'],
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
   a `scenes.js` with one example scene (pills only — the prose goes in `doc`), a `compute.js` returning
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
│   │   ├── catalogue.js          # who made this: author, affiliation, licence
│   │   ├── registry.js           # glob over manifests + scenes, applies core defaults
│   │   ├── router.js             # hash routing + strict-cast state↔URL
│   │   ├── store.svelte.js       # global reactive state (runes)
│   │   ├── rng.js                # mulberry32 — the ONLY allowed generator
│   │   ├── numeric.js            # shared pure math (normalPdf, erf, quantiles,
│   │   │                         #   Student t, trapz, small linear solver) —
│   │   │                         #   importable from compute.js and check.js
│   │   ├── dsp.js                # shared DSP idiom (tone, spectra, dB, peakNear)
│   │   ├── linalg.js             # matvec, eigen (jacobiSym), solve, ridge, svd
│   │   ├── filters.js            # shared digital-filter primitives
│   │   ├── palette.svelte.js     # data-mark palette preference (remaps the 5 hexes)
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
│   │   │                         #   frequency response with another
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
│   │   ├── Workspace.svelte      # composes: Tabs, ViewHost, PlotFrame,
│   │   │                         #   PromptBar
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
│       ├── stats/ estimation/ detection/ regression/     # inference
│       ├── analog/ conversion/ spectral/ filtering/      # signals & systems
│       └── control/ comm/ numerics/ ml/                  # applications, tools
└── tests/                        # optional — the main harness is check.js
```

**The subject order IS the reading order**, in four blocks, and the `order` key
of each `_subject.js` is what writes it: a listener reads the sidebar top to
bottom and must find each subject where its prerequisites have already been
met. Inference first (a distribution, then a parameter read off it, then a
decision made about it, then a model fitted to it); the signal chain next
(a continuous signal, its sampling, its spectrum, its filtering — windowing
before FIR design, because the design method IS a window); then the two
applications, control before communications since a link composes detection,
filtering and spectral analysis all at once; and the numerical and learning
toolbox last, where a gradient descent precedes the network trained by one.
A rank is unique inside its subject and `npm run check` says so — two
experiments claiming the same one sort by accident, which is the failure this
project refuses everywhere else.

## Conventions

- **Everything in English**: code, UI chrome, comments, commit messages, and the
  pedagogical content (labels, titles, docs, validation messages) that lives in
  the manifests. A recurring term is chosen once in `TERMINOLOGY.md` and used
  identically across the catalogue — a listener moving from one experiment to the
  next must never re-learn a name.
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
- localStorage: cosmetic preferences only (theme, sidebar, palette) — never
  experiment state, which lives in the URL.
- Responsive (sidebar as mobile drawer, adapted Prompt Bar); baseline accessibility
  (visible focus, `prefers-reduced-motion`, AA contrast).

## Development phases

1. **Core + chatbot UX**: full core (registry, router with strict casting, store,
   rng, actions, observables, scales, worker-host with **lecture guard**: status,
   1.5 s timeout + resurrection, try/catch), Sidebar, Header with preset selector,
   Workspace (Tabs, ViewHost, PlotFrame, PromptBar with non-modal popovers and
   actions), generated DrawerParams (visibleIf, validate, derived,
   display), generic plots + overlays. Full validation on
   `estimation/confidence-intervals`.
2. **Trial by fire**: `detection/neyman-pearson` (`log` param for SNR,
   densities+threshold / ROC / Pd vs SNR) to stress-test and **lock the manifest
   schema**. No other experiment before this lock.
3. **Lecture polish**: CommandPalette, full shortcuts, Presentation Mode,
   **freeze frame (F)**, Inspector, exports (SVG, PNG, clipboard), scaffold.
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
