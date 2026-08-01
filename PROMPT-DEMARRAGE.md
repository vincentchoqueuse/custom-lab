# Kickoff prompt — paste into Claude Code (session 1)

Read CLAUDE.md carefully, then deliver **phase 1 (Core + chatbot UX)**.

Initialize the project (Svelte 5 + Vite, purely static) and build the core following
the chain compute → typed observables → declarative views → graphic components:

- `core/`: registry (import.meta.glob over manifests AND scenes.js, applying the
  **core defaults**: injected seed param, implicit float type, default actions,
  flat group fallback, scene view/drawer defaults — see "Core defaults" in
  CLAUDE.md), router (bidirectional state↔URL including the
  seed, **strict casting on decode** per manifest type, invalid value → silent
  default), store, rng (mulberry32 + gaussFrom), **actions.js** (registry:
  randomizeSeed, resetDefaults, revealHidden), **observables.js** (type inference:
  Float64Array → vector, number → scalar, {x,y} → series, [{…}] → records; optional
  meta), **scales.js** (thin wrapper re-exporting configured d3 primitives — scaleLinear,
  scaleLog, ticks, bin, line/area path generators, SI format preset; piecemeal
  imports from d3-scale/d3-array/d3-shape/d3-format only, never d3-selection, never
  the full d3 bundle; all plots and custom views import from this module only), **fields.js** (field
  factories float/int/bool/select/log/readonly; first positional arg = name, the
  displayed symbol, defaulting to the param key; flat keys description/unit/
  precision — never concatenated into one label string; load-time validation
  throwing named errors: min<max, default in bounds, select default in options;
  pills render `name = value unit`, drawer renders name + description as secondary
  text, description feeds the tooltip), **views.js** (view/custom factories + one
  factory per graphic type: histogram/line/scatter/bars/vline/hline/density/band,
  same factory as main plot or overlay by position, flat style keys, load-time
  validation with named errors, dev-mode cross-check of observable sources against
  the first compute result), **checks.js** (standardChecks factories,
  at least determinism), **strings.js** (all core UI strings as English constants),
  worker-host (30 Hz throttle + **lecture guard**: 'computing' status at 100 ms,
  1.5 s timeout → terminate + fresh worker + restore last valid params + statline
  message, try/catch around compute → 'error' status rendered on the PlotFrame);
- `ui/`: dark collapsible Sidebar (⌘B) with footer (theme + Teacher Mode), Header
  with breadcrumb, **central preset selector styled like an LLM model picker**,
  copyable URL chip, presentation-mode button;
- `Workspace`: Tabs, ViewHost ({layout, plot, overlays} + custom type), PlotFrame
  (statline + SVG/PNG export), TeacherBanner (scene notes), **bottom PromptBar**:
  pills for the preset's `visible` params (honoring display: unit/precision/tooltip),
  NON-modal popover on click (plot stays fully visible while dragging), then the
  manifest's actions — 🎲 Draw = randomizeSeed (shortcut R, increments the seed) —
  and the ⚙ button (shortcut P);
- `DrawerParams`: right slide-in drawer, closed by default, generated from the schema
  — all field-factory types (float/int/select/bool/log/readonly + injected seed),
  groups, visibleIf, validate (invalid state = computation blocked, message shown),
  derived, unit/precision/description rendering;
- `ui/plots/`: Axes, Histogram, Line, Scatter, Bars + overlays VLine, HLine, Density,
  Band — zero scientific computation inside; axes accept the string shorthand
  (label, linear) or the object form { label, scale: 'linear'|'log', unit, format,
  domain } mapped onto core/scales.js (log axes render decade ticks);
- Shortcuts per the canonical table in CLAUDE.md: ⌘K (stub acceptable in phase 1),
  ⌘B, P, R, L (Presentation Mode = **fullscreen via the Fullscreen API** + strokes
  ×1.6 + type ×1.3), ←/→ (presets), Esc; inert while a text field has focus.

Validate everything with the complete experiment
`experiments/stats/confidence-intervals/` as specified in CLAUDE.md's full-schema
example — four files: manifest.js (definition), scenes.js (both scenes with pills
and teacher notes, auto-discovered), compute.js, check.js (pedagogical labels and
notes in French, as authored content):

- `compute.js` pure, stateless, seeded: M intervals over N Gaussian draws, Student or
  Gaussian CI depending on `known`; observables: means, intervals, coverage,
  meanHalfWidth (with meta), theoreticalDensity, coverageVsN;
- three views: Realizations as CUSTOM (M stacked horizontal segments, misses in
  #D95319, vertical dashed μ line in #EDB120 — justify the custom choice in a
  comment), Distribution of x̄ declarative (histogram + density + vline), Coverage
  vs N declarative (line + hline 1−α);
- both presets (pills N/conf then conf alone, drawer closed, teacher notes),
  selectable from the header and with ←/→;
- `check.js` with categories: coverage ≈ 1−α within 1% (statistical, σ known, M=10⁴),
  Student width > Gaussian width at small N (numeric), half-width decreasing as 1/√N
  (numeric).

Acceptance criteria:
1. `npm run dev`: opens on stats/confidence-intervals, sober screen (drawer closed,
   pills at the bottom), fluid popovers, R draws instantly, the URL reflects every
   change, reloading a deep URL restores the exact state (params, view, preset,
   drawer).
2. `npm run check`: all checks pass, printed by category with execution time.
3. `npm run build`: static build deployable as-is on Netlify.
4. No reference to any specific experiment inside src/core/ or src/ui/.
5. Declarative views contain zero scientific computation — everything comes from
   observables.
6. No modal for parameters; non-modal popovers, plot always visible.
7. compute() stays pure with no lifecycle (no setup/reset/dispose).
8. Lecture guard verifiable: maxing out M and N never freezes the UI ('computing'
   status then, if needed, clean abort with message); a forced exception in compute
   shows "⚠ Computation error" with no white screen.
9. A hand-mangled URL (out-of-bounds value, unknown param, invalid type) loads the
   experiment with defaults, no crash.
10. All code, comments and UI chrome in English; pedagogical content (labels, notes)
    stays in the manifest, in French.

Aesthetics follow CLAUDE.md's UX section — Open WebUI-style sidebar, clean light
central area, MATLAB plot palette, IBM Plex Sans/Mono, 150 ms transitions, visible
focus.

Once phase 1 is validated, we will move to detection/neyman-pearson (phase 2, with a
log param for the SNR) to stress-test and then lock the manifest schema.
