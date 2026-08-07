---
name: lecture-scenes
description: Write and review the lecture script of a pupitra experiment — the context/problem/method scene plan, and the Prompt Bar pill rules (2-3 per scene, ordered, short labels). Use whenever adding or editing scenes.js, choosing which params a scene exposes, wording select option labels, or auditing an experiment's pedagogical staging.
---

# The lecture script: scenes and pills

`scenes.js` is the file reopened the night before class. It is not a list of
settings — it is an ARGUMENT, and the room follows it on ←/→. This skill is the
shape that argument takes in this catalogue, and the recurring corrections that
produced it.

Read alongside `new-experiment` (which covers the four files) and CLAUDE.md
(which owns the contract). Everything here is in English, like the rest.

## The plan: context → problem → method

Most experiments should carry the same three beats, in this order. A listener
moving from one experiment to the next then recognises the shape before reading
a word.

**1 · CONTEXT** — the nominal case, where everything behaves.
The room meets the object and learns what "normal" looks like. Nothing is wrong
yet, and nothing is being demonstrated yet. Scene 1 auto-applies on load, so
this is also the landing picture of every shared link: it must be the figure you
would want on screen when a colleague opens the URL cold.
*Pills: the parameters that DEFINE the situation.*

**2 · PROBLEM** — the question the context cannot answer.
Something breaks, or a number refuses to behave. This is THE scene, the one the
experiment exists for, and it is written as a gesture: freeze (F), move ONE
dial, watch. It wants a provocative question asked BEFORE the dial moves —
"more data will fix this, won't it?" — and the wrong answer the room is expected
to give.
*Pills: the dial that breaks it, first, then what the room will want to try.*

**3 · METHOD** — the tool that answers it, and what it costs.
One or more scenes: the estimator, the algorithm, the correction. End on the
invoice — what the method does NOT buy. A method presented without its price is
a sales pitch, and the catalogue's habit is the opposite.
*Pills: the method's own knobs.*

The plan is a default, not a cage. It genuinely does not fit two shapes, and
forcing it there makes a tour look like an argument:

- an ATLAS ("Signal catalogue", "Constellations") — a guided visit, where each
  scene is a specimen and there is no single problem;
- a REFERENCE FIGURE that the course simply needs to read (a Bode plot of a
  known system).

When you skip the plan, say so in a comment at the top of `scenes.js`, with the
reason. An unexplained departure reads as an oversight.

## Pills: two or three, never one, never a sentence

The Prompt Bar holds ONLY the active scene's `visible` params. It is the
instrument's keyboard, and the whole look→adjust→look loop happens there.

**COUNT — 2 or 3, occasionally 4. Never 1.**
A single pill is a slider, not a scene. The room can turn it but cannot
COMPARE, and comparison is what a demonstration is for: the second pill is what
lets someone ask "and if N were larger while σ stays put?". If a scene honestly
needs one dial, it needs a second one to hold fixed on purpose — expose the
quantity the room will suspect is doing the work, so that keeping it still is
visibly a choice.
Past four, the bar stops being readable from the back of a room; the drawer (P)
exists for everything else.

**ORDER — what the scene is ABOUT comes first.**
The pill that decides WHAT is drawn precedes the ones that refine it. From a
correction, in the user's words: for the spectrogram, *"le type de signal et la
fenêtre en pills, type de signal en 1"* — the signal chooses the picture, the
window chooses how it is read, N only sharpens it. Same rule everywhere.

**PAIRS TRAVEL TOGETHER.**
Two parameters that name the two axes of one picture are one gesture, and
exposing half of it is exposing none. PCA had `x` alone for every scene while
its own scene titles asked for "PC3 across, PC4 up" — a gesture the pills could not
make. If a scene shows a plane, both axes are pills.

**LENGTH — a pill reads `name = value unit`, and stays short.**
Two caps, because either one alone lets the other run away: a `select` option
label is **24 characters or fewer**, and the pill as rendered — `name = label` —
is **30 or fewer**. Thirty-five pills passed the label rule and still came out
past thirty, `modulation = 8-PSK (constant modulus)` among them. A pastille
carrying `MMSE — (HᴴH + N₀I)⁻¹Hᴴ, unbiased for the decision` is not an
interface, it is a paragraph with a border. The explanation has two proper
homes:

- the param's `description` — drawer secondary text and tooltip;
- the manifest `doc` — where the formula and the reasoning belong anyway.

`npm run check` enforces both the count and the length. A scene with one pill,
or an option label over the limit, fails the catalogue checks.

## Recurring corrections, as a checklist

Collected from real review passes. Each one was a live objection, not a rule
invented in the abstract.

- **"C'est hors sujet."** A view that does not teach THIS experiment's lesson is
  removed, however correct it is. Extra representations are the most common
  thing to over-build.
- **The first scene opens on the figure the lecture starts from.** For a
  spectral-analysis experiment that is the SPECTRUM, not the time signal, even
  though the time signal is view 1 by the tab grammar. The tab order is the
  catalogue's grammar; the scene's `view` is the lecture's.
- **Frame the phenomenon, not the function's whole support.** The activation
  functions were drawn over [−4, 4] where a nonlinearity says everything it has
  to say between −2 and 2; the bend was a small kink between two flat wings.
  Choose the window where the effect fills the frame.
- **Set EVERY param that matters** in a scene's `params`. A param added later
  otherwise leaks its default into old scenes and changes their story silently.
- **"Très classique sans surprise."** For chrome, the expected thing beats the
  clever thing. Reach for the convention a reader already knows.
## Writing the doc

A scene carries no notes: the argument the scenes stage is written up ONCE, in
the manifest's `doc`, as public prose for the info panel (I). The three beats
give the doc its shape too — the situation, the thing that breaks, the method
and its price — written for any reader rather than as stage directions: "press
R" becomes "redrawing shows…". Two to four paragraphs separated by blank
lines, and KEEP THE MEASURED NUMBERS — "the gap goes 0.0062 → 0.0003" —
because a doc that can quote a number is the difference between a claim and a
demonstration.
