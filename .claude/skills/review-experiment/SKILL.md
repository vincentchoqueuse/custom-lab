---
name: review-experiment
description: Review an existing or contributed Custom Lab experiment against the project contract — science, checks, declarative discipline, French pedagogical content, performance. Use when asked to review, audit, or validate an experiment or an experiment PR.
---

# Reviewing a Custom Lab experiment

Review in this order — a failure early makes the rest moot. Verify by
reading AND by running (`npm run check`, then the browser).

## 1. Science first

- Is every formula in compute.js correct? Re-derive the key ones; do not
  trust comments. A wrong formula projected in a lecture hall is the one
  unacceptable bug of this project.
- Are the "theory" observables actually theory (closed form, exact
  enumeration) and not a second simulation dressed up as one?

## 2. The check harness

- `standardChecks.determinism` present? At least one `numeric` or
  `statistical` check that would CATCH a sign error or a wrong constant?
- Statistical tolerances: derived (4 × a written standard error), not
  magic. Exact identities preferred (see the new-experiment skill).
- Run `npm run check` and read the printed details — a check that passes
  with a suspiciously loose margin is a smell.

## 3. Contract discipline

- Compute: pure, seeded (`core/rng.js` only), serializable, Float64Array
  hot loops, bounded work at param maxima (validate rule for the rest).
- No science in views; declarative first — a custom view needs a written
  justification comment and must delegate to generics (IQPlane…) when one
  fits. A pattern repeated twice must be promoted, not copied.
- No re-implementation of anything in numeric/laws/codes/modulation.
- Colors: canonical MATLAB hexes only (palette remap depends on it).
- No core edits smuggled into an experiment PR.

## 4. Pedagogy

- French pedagogical content, English code — both ways round is a defect.
- Scenes: do they script GESTURES (freeze, move, compare, ask the room)
  or just list parameter values? Each scene sets every param its story
  depends on. Notes never travel in the URL.
- Does each view teach exactly one thing? Would a projector at the back
  of a lecture hall read it (statline meaningful, legend short)?

## 5. Runtime

- Build, open every view at defaults AND at param extremes (sliders to
  both ends): no console errors, no worker timeout, no empty plot, log
  axes never fed zeros. Check the URL round-trip: copy the hash, reload,
  identical state.

Report findings ordered by severity: science > checks > contract >
pedagogy > style. For a PR, verify `npm run check` in CI is green before
anything else.
