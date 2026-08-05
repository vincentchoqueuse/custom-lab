// Lecture script. Auto-discovered by the registry.
//
// The spine of this script is the experiment next door. `subspace` postulates
// "d lines in white noise" and is HANDED d; this one is given the same signal,
// the same window and the same decibels, and is not told how many lines there
// are. Every scene is written to be played right after that one.
const BASE = {
  sources: 2,
  df: 1.5,
  snr: 25,
  N: 256,
  over: 2,
  offGrid: 0,
  algo: 'omp',
  k: 2,
  lam: 0.1,
  alpha: 1,
  seed: 34,
};

export default [
  {
    id: 'count',
    title: 'Scene 1 · Nobody said how many lines there are',
    params: { ...BASE, k: 0 },
    visible: ['k'],
    notes: `Arrive here straight from "High-resolution methods", on purpose: same
Fs, same record, same two lines around 200 Hz, same 25 dB, same window. One thing
changed — MUSIC was handed d = 2. Here nothing is.

Say the shape of the problem out loud before touching anything: 256 samples, a
dictionary of 514 columns. The normal equations have no unique solution; there
are infinitely many ways to explain this record exactly. What picks one is the
assumption that only a few columns are used.

Now take k up, one step at a time. Two steps, two lines, and the reconstruction
lands on the signal.

Between two steps, ask how it chooses. Switch to "What the algorithm sees": that
curve is the correlation of the residual with EVERY atom at once, and it is a
single zero-padded FFT — the periodogram of what is left. The rule is "take the
tallest peak and subtract it", which is CLEAN, written by radio astronomers for
this exact problem.`,
  },
  {
    id: 'denoise',
    title: 'Scene 2 · What the sparsity buys: a denoiser',
    view: 'time',
    params: { ...BASE, snr: 5, k: 2 },
    visible: ['snr', 'k'],
    notes: `Take the SNR down to 5 dB and stay on the time view. The grey trace is
what was measured and it is a mess; the orange dashed one is the signal that was
actually sent.

Take k from 0 to 2 and watch which of the two the blue lands on. It lands on the
ORANGE. That is the argument for a sparse model in one gesture: with 514 columns
available it could have gone through every grey point exactly — and fitted the
noise doing it — but two columns cannot represent noise, so the only thing it can
reproduce is the part of the record that is structured.

The statline gives the number, and the room can check it in its head first: the
error is the noise projected onto 2k = 4 dimensions out of 256, so 4/256 of its
energy survives — 10·log10(256/4) ≈ 18 dB, and no free lunch anywhere.

Then push k past 2 and let them watch the gain come back DOWN. Every atom past
the second explains no signal and keeps a little more noise. Choosing k IS the
estimation problem — and it is the same problem MUSIC solves by being told d.`,
  },
  {
    id: 'orthogonal',
    title: 'Scene 3 · Where the O of OMP is',
    view: 'correlations',
    params: { ...BASE, k: 1 },
    visible: ['algo', 'k'],
    notes: `Stay on "What the algorithm sees" and look at the frequency already
taken: the curve has a NOTCH there, straight to the floor. That notch is not
cosmetic — the residual of OMP is orthogonal to every atom it has selected, so
the correlation is exactly zero. The statline reads it as "⟂ defect" and prints
0.000000; the number behind it is around 1e-15.

Consequence, and have the room state it before you show it: OMP can never pick
the same atom twice, because a zero can never be the maximum.

Now switch the algorithm to MP. Same selection rule, one difference — MP fits
each line once, against the residual of the moment, and never goes back. The
notches are gone, the orthogonality defect is no longer zero, and "re-selected"
starts counting. MP spends iterations repairing its own earlier answers.`,
  },
  {
    id: 'resolution',
    title: 'Scene 4 · Δf = 0.5 — where MUSIC wins and this does not',
    view: 'spectrum',
    params: { ...BASE, df: 0.5, k: 2 },
    visible: ['df', 'over'],
    notes: `THE scene, and the reason this experiment sits after the
high-resolution methods rather than before.

Δf = 0.5 is the neighbouring experiment's own default: half a Fourier limit, the
setting where the periodogram sees one lump and MUSIC separates the two lines
cleanly from 20 dB up. Put the same number here.

It fails. Not gracefully — it puts one atom on each SIDE of the pair, at 197.3
and 203.1 Hz, while the true lines at 199.2 and 201.2 sit between them. Measured
over twelve draws: 0 out of 12 at Δf = 0.5, 4 out of 12 at 1.0, and 12 out of 12
at 1.5. This method does not beat the Fourier limit — it needs about one and a
half of them.

Before explaining, let the room try the obvious repair: refine the grid. Take it
to ×2, then ×4. Nothing improves, and the statline says why — "coherence" climbs
from 0 to 0.637 to 0.900. Adding candidates that look alike adds no information.

Then say the thing worth taking away. MUSIC does not separate 0.5 because it is
cleverer; it separates because it was TOLD there are two lines, and that
postulate is worth more than any amount of grid. Take the postulate away and the
resolution goes back to Fourier. The gain of the previous experiment was never
free — this is its invoice.`,
  },
  {
    id: 'lasso',
    title: 'Scene 5 · The other road: a penalty instead of a count',
    view: 'spectrum',
    params: { ...BASE, algo: 'lasso', lam: 0.4 },
    visible: ['lam', 'algo'],
    notes: `Everything so far imposed the sparsity by COUNTING: k atoms, stop. The
other formulation penalizes instead —

    min ‖x − D c‖²  +  λ · Σ ‖c_l‖

— and the dial is no longer a number of atoms but a weight λ. Same objective, two
roads. Worth stating plainly: OMP has no λ and cannot have one; it is not a
penalized least squares, it is a combinatorial search done greedily.

Take λ from 1 downwards and narrate the path. At λ = λmax the solution is EXACTLY
zero — not small, zero, and that threshold is known in closed form. Then lines
appear one by one, in the order the greedy chose them, which is not a coincidence.

Then look at the two stems. The blue ones are the lasso's amplitudes and they are
SHORT; the green ones are the same frequencies refitted by ordinary least
squares. The gap is the price of the penalty and it is exactly 2λ/N — the same λ
that selected the lines also shrinks them. "Debiasing the lasso" is nothing more
than the green stems: keep the support, throw the penalty away, refit.

Last, switch to "What the algorithm sees". The green horizontal is λ, and the
correlation curve is CAPPED by it, touching it exactly on the active lines. That
is the optimality condition of the convex problem — the exact counterpart of
OMP's notches. Both algorithms stop for a reason; this is what each reason looks
like.`,
  },
  {
    id: 'fista',
    title: 'Scene 6 · Calibrating the step: a guarantee is not an optimum',
    view: 'spectrum',
    params: { ...BASE, algo: 'lasso', lam: 0.1, alpha: 1 },
    visible: ['alpha', 'lam'],
    notes: `The convex road needs a step, and this one is not guessed: the data
term is a quadratic, so its Lipschitz constant is ‖DᵀD‖, and for this dictionary
that is exactly nfft/2 — no line search, no tuning. The certified step is 1/L,
which is α = 1.

Now the part worth an amphitheatre. Move α and read the step count in the
statline: it falls as α rises past 1. The certified step is NOT the fastest. 1/L
is what the proof needs in order to promise convergence — a sufficient condition
— and the promise is bought with a margin the proof cannot know how to spend.

Keep going. Somewhere below α = 2 it says DIVERGED. So the picture is: a range
where it works, a range where it works faster, and a cliff. Ask the room which of
the three a proof can tell you about.

The other half, and the one to insist on: while it converges, the ANSWER never
moves. Same lines, same amplitudes, same output SNR at every α. The step changes
how long the solver takes and nothing else, because the problem is convex and has
one minimum. Put that beside scene 3 — greedy's answer IS the path it took, which
is exactly why the coherent grid of scene 4 ruins it. That is the real trade
between the two roads, and it is not about speed.`,
  },
  {
    id: 'offgrid',
    title: 'Scene 7 · Off the grid, nothing is sparse',
    params: { ...BASE, k: 2, snr: 40 },
    visible: ['offGrid', 'k'],
    notes: `Freeze (F) with δ = 0, then take the offset to ½ a search cell — the
lines now fall exactly between two atoms.

Two lines still, two iterations still, and the residual barely moves. The reason
is on the spectrum tab: a frequency that is not in the dictionary is not
represented by one column, it LEAKS onto all of them. The signal is not sparse in
this dictionary — sparsity was never a property of the signal, it was an
assumption about the PAIR (signal, dictionary), and here the pair is wrong.

Take k up to 12 and let the room watch the algorithm spend its whole budget
buying back leakage, one atom at a time.

Worth naming out loud, because it is where the field went next: this is the
"basis mismatch" problem, and the answers to it — a continuous dictionary, atomic
norms, gridless methods — are a research direction and not a tuning knob. It is
also, note, a problem root-MUSIC and ESPRIT do not have at all: they return
numbers, not grid points. One more line on the invoice.`,
  },
];
