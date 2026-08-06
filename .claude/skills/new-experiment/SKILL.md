---
name: new-experiment
description: Design and build a complete, numerically verified Custom Lab experiment (manifest, compute, scenes, checks). Use whenever asked to add, create, or extend an experiment, a subject, or a lecture demo in this repository. Encodes the contract, the shared-code inventory, the check-writing craft and the pitfalls learned while building the first 30 experiments.
---

# Building a Custom Lab experiment

An experiment is a self-contained pedagogical object: 4 files in
`src/experiments/{subject}/{id}/`, zero core changes, auto-discovered.
Read `CLAUDE.md` for the full contract; this skill is the workshop manual —
what to reuse, in which order to work, and where the traps are.

## Order of work (never skip step 1)

1. **Design on paper first**: the 2–3 views (each must teach ONE thing),
   the 2–4 lecture scenes (each is a professor's gesture: "freeze, move X,
   compare"), and the checks (which exact identities and closed forms will
   prove the science right?). If you cannot name a closed form or an exact
   identity to check, the design is not ready.
2. `compute.js` — the science. 3. `manifest.js`. 4. `scenes.js`.
5. `check.js`, then `npm run check` until green.
6. Build + Playwright validation in the browser (screenshots of every view).
7. Commit `exp({id}): …`, PR, merge (see Delivery below).

## Reuse before writing — the shared inventory

Import from these instead of re-implementing (all pure, worker- and
Node-safe, usable from compute.js AND check.js):

- `core/numeric.js` — `mean`, `median`, `variance(a, {sample})`,
  `normalPdf/Cdf/Quantile`, `qfunc` (Gaussian tail Q), `erf`, `logGamma`,
  `regularizedIncompleteBeta`, `studentCdf/Quantile`, `trapz`,
  `polyval`, `solveLinearSystem` (pivoted, ≤ ~30 unknowns), `sinc`,
  `dbToLin`, `rk4Step(f, x, t, h)` (array state), `pairsToSeries`.
- `core/rng.js` — `mulberry32(seed)`, `gaussFrom(rng)`. NEVER `Math.random()`.
- `core/dsp.js` — `tone`, `magSpectrum`, `spectrumComplex`, `dbAmpAll`,
  `peakNear`, `linspace`, `timeAxis`, `freqAxis`, `noiseSigma`.
- `core/linalg.js` — `matvec`, `jacobiSym`, `solveLinearSystem`,
  `normalEquations`, `ridgeSolve`, `svd`, `lowRank`.
- SUBJECT-OWNED science lives in that subject's `_lib`, not in core:
  `stats/_lib/laws.js` (canonical sampling laws with exact moments),
  `comm/_lib/codes.js` (Hamming(7,4), repetition×3, `berHardExact`),
  `comm/_lib/modulation.js` (unit-energy constellations, `serTheory`,
  `berTheoryGray`), `control/_lib/{bode,lti}.js`, `spectral/_lib/subspace.js`.
- `core/fields.js` — `float, int, log, bool, select, coeffs, readonly`.
  `log` is MANDATORY for anything spanning orders of magnitude.
  `coeffs` = numeric list param (URL `?den=1,2,1`). `visibleIf: {p: v}`
  or `{p: [v1, v2]}`.
- `core/views.js` — `view`, `plane`, `custom`, `histogram, line, scatter,
  bars, vline, hline, density, band`. Same factory works as main plot or
  overlay. vline/hline sources: a param name, `p => fn(p)`, or a scalar
  observable. `plane(id, title, {clouds, markers, segments, circle, axes,
  minHalf, maxHalf})` covers every equal-aspect plane (I/Q, poles, z-plane)
  declaratively — reach for a custom view only when it fits none of these.
- `ui/plots/IQPlane.svelte` — generic EQUAL-ASPECT plane (props: clouds,
  markers, labels, segments, xLabel/yLabel, minHalf/maxHalf). Use it for any
  I/Q, pole-plane or 2D-cloud view via a thin custom-view binding.
- `core/checks.js` — `standardChecks.determinism(compute, params, obsName)`
  is mandatory in every check.js. Write identity checks with `maxGap(points,
  f, g)` / `maxAbsDiff(a, b)` / `range(n, f)` rather than hand-rolled
  accumulation loops: the check then reads as the identity itself.

## Compute rules and tricks

- PURE, stateless, seeded, serializable. Destructure every param; `seed` is
  injected by the core (destructure `seed` even if unused — or omit it from
  the signature entirely when fully deterministic).
- `Float64Array` in hot loops; keep total work well under the 1.5 s worker
  timeout at the params' maxima; add a `validate` rule (e.g. M×N bound) as
  the first line of defense.
- **Many overlaid traces = ONE series with NaN separators** — the generic
  Line breaks paths at NaN (eye diagram, basis functions). No custom view
  needed for "spaghetti" plots.
- Scalars appear in the statline ONLY with `meta.label`; a bare number is a
  scalar observable usable by vline but invisible in the statline (useful).
- Views never compute science; if a view needs decision boundaries,
  contours (marching squares), envelopes… compute them as observables.

## Check-writing craft (the soul of the project)

- Two categories: `numeric` (exact: 1e-9…1e-15) and `statistical`
  (tolerance = **4 × a derived standard error**, never a magic number —
  write the SE formula in a comment).
- The strongest checks are **exact identities**: EQM = biais² + variance at
  finite M, Parseval, enumeration vs closed form, λ=1 degeneracy,
  continuity across a regime boundary (m = 1±ε), "no estimator beats the
  CRB anywhere". Prefer them to tolerance checks.
- check.js consumes the RAW compute output: wrapped scalars are
  `o.name.value`, but records/arrays are the raw value itself (NOT
  `.value` — that wrapper only exists after UI normalization).
- When a check fails, first ask **"is the check's physics right?"** Real
  examples from this repo: a rect pulse's triangular autocorrelation makes
  τ̂ = τ±2 legitimate; training-error monotonicity is a theorem only for
  NESTED basis families; open-loop ramp error converges to Στᵢ (the
  closed-loop 1/Kv story does not apply); strong damping leaves the
  asymptotic O(hᵖ) regime at large T. A "failing" check that reveals
  physics becomes a documented check, not a loosened tolerance.

## Manifest / scenes conventions

- EVERYTHING in English — code, comments, and the pedagogical content alike
  (title, subtitle, descriptions, labels, notes, validate messages). One
  language, no i18n (CLAUDE.md principle 6). A recurring term is chosen once
  in TERMINOLOGY.md and reused identically.
- Data-mark colors: ONLY the canonical MATLAB hexes `#0072BD #D95319
  #EDB120 #7E2F8E #77AC30` (the palette preference remaps them at render;
  any other hex escapes the remap). Convention: blue = empirical/true,
  orange = estimated/theory-overlay, yellow = reference lines (vline θ,
  thresholds), purple/green = additional series.
- Log axes never include 0 — series feeding a log axis must be positive
  (floor with `Math.max(v, 1e-16)` when a quantity can hit exact zero).
- Fixed axis domains are fine (data layers are clipped to the frame).
- Scenes: set EVERY param that matters to the story (a later-added param's
  default will otherwise leak into old scenes); `view` defaults to the
  first view; notes are teacher-only gestures ("freeze (F), raise X,
  compare") and love a provocative question for the room.
- Scene 1 auto-applies on load — the default landing IS scene 1.
- **The scene plan and the pill rules live in the `lecture-scenes` skill**:
  context -> problem -> method, 2-3 pills per scene ordered with the subject
  of the scene first, select labels 24 characters or fewer. Read it before
  writing scenes.js.

## Browser validation (before every commit)

```bash
npm run check && npm run build
(npx vite preview --port 4173 >/dev/null 2>&1 &) ; sleep 3
```
Playwright with `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })`;
target views explicitly (`#/subject/id?view=…&param=…` — remember scene 1
overrides defaults), check the statline text, count SVG marks (a NaN-broken
series is ONE path — don't assert high mark counts), screenshot every view
and LOOK at the screenshots. No console errors allowed.

## Delivery

- `npm run check` must be green (it gates deployment).
- Commit message: `exp({id}): one-line story` + a body that tells what the
  views show and what the checks prove, with the measured numbers.
- New subject: add `src/experiments/{subject}/_subject.js` with
  `{ title, order }` — nothing else; discovery is automatic.
- Never touch the core for an experiment. If the core genuinely lacks
  something (a field type, a plot capability), that is a SEPARATE commit
  with its own justification, validated by the full smoke suite.
- A custom pattern repeated twice becomes a generic (promote to ui/plots/
  or core/), with the custom views turned into thin bindings.
