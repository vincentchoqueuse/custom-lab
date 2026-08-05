// Lecture script. Auto-discovered by the registry.
//
// THE SCRIPT IS THE SPECTRUM, and the three roads to it. The subject is
// spectral analysis, so the figure a scene opens on is the SPECTRUM unless it
// has a reason not to be — the periodogram first, because that is the picture
// every other method in the subject is trying to improve on, then the two
// families of answer: the greedy pursuits, MP and OMP, and the convex one, the
// lasso. The last two scenes are the invoice.
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
  zoom: 'full',
  algo: 'omp',
  k: 2,
  lam: 0.1,
  alpha: 1,
  seed: 34,
};

export default [
  {
    id: 'periodogram',
    title: 'The periodogram, and what it does not say',
    view: 'spectrum',
    params: { ...BASE, k: 0 },
    visible: ['snr', 'df'],
    notes: `Arrive here straight from "High-resolution methods", on purpose: same
Fs, same record, same two lines around 200 Hz, same 25 dB, same window. One thing
changed — MUSIC was handed d = 2. Here nothing is.

Start on the grey curve alone, with k = 0, and read it as a periodogram: two
peaks about 6 Hz apart, each one a lobe several hertz wide, and a floor of
sidelobes underneath. Every question the rest of this experiment answers is
already visible in it. HOW MANY lines are there — two peaks, or two peaks and a
third one hiding in the floor? WHERE exactly are they — the maximum of a lobe is
not the frequency of a line, it is the frequency of a line plus whatever the
neighbouring lobe adds to it. And with WHAT amplitude — a lobe's height is the
line's power convolved with the window.

Say the shape of the problem out loud before touching anything: 256 samples, a
dictionary of 514 columns. The normal equations have no unique solution; there
are infinitely many ways to explain this record exactly. What picks one is the
assumption that only a few columns are used — and the two scenes that follow are
the two ways the field has found to impose it.

Take the SNR down to 5 dB and back to see how much of the floor is noise and how
much is the window. Take Δf down to 0.5 and watch the two peaks become one lump:
that is the Fourier limit, and it is the subject of scene 5.`,
  },
  {
    id: 'greedy',
    title: 'The greedy road: MP, then OMP',
    view: 'spectrum',
    params: { ...BASE, algo: 'mp', k: 1 },
    visible: ['algo', 'k'],
    notes: `The first family, and it is the older one: take the tallest peak,
subtract it, look again. That is matching pursuit — CLEAN, written by radio
astronomers for exactly this problem.

Start with algo = MP and k = 1. One blue stem, standing on the periodogram at
the peak it explains. Take k to 2, then 3, 4, then twelve, one step at a time.
The first two land on the lines; everything after that lands ANYWHERE — 16 Hz,
328, 412, 35 — which is why this figure shows the whole band. Those atoms are
not explaining signal, they are buying back the leakage and the noise of the
first two, and scattering across 500 Hz to do it. That scatter IS the answer to
"why not just take k large".

Then switch to "What the algorithm sees". That purple curve is the correlation
of the residual with EVERY atom at once — a single zero-padded FFT, which is to
say the periodogram of what is left. The selection rule is read straight off it:
take the maximum.

Now the difference between the two greedy methods, and it is one word. Leave the
tab where it is and switch algo from MP to OMP. A NOTCH appears at every
frequency already chosen, straight to the floor. That notch is not cosmetic: the
residual of OMP is orthogonal to every atom it has selected, so the correlation
there is exactly zero — the statline reads "⟂ defect" and prints 0.000000, the
number behind it being about 1e-15. MP has no such notch, its defect is not
zero, and "re-selected" starts counting: MP spends iterations repairing its own
earlier answers, because it fits each line once against the residual of the
moment and never goes back.

Consequence, and worth having the room state it before you show it: OMP can
never pick the same atom twice, because a zero can never be a maximum.

Last, the argument for a sparse model at all — take the SNR down to 5 dB and go
to the time tab. With 514 columns available the fit could have gone through
every noisy sample exactly; two columns cannot represent noise, so all it can
reproduce is the part of the record that is structured. The room can check the
statline's number in its head first: the error is the noise projected onto
2k = 4 dimensions out of 256, so 10·log10(256/4) ≈ 18 dB, and no free lunch
anywhere.`,
  },
  {
    id: 'lasso',
    title: 'The convex road: a penalty instead of a count',
    view: 'spectrum',
    params: { ...BASE, algo: 'lasso', lam: 0.4 },
    visible: ['algo', 'lam'],
    notes: `The greedy road imposed the sparsity by COUNTING: k atoms, stop. The
other family penalizes instead —

    min ‖x − D c‖²  +  λ · Σ ‖c_l‖

— and the dial is no longer a number of atoms but a weight λ. Same objective,
two roads. Worth stating plainly: OMP has no λ and cannot have one; it is not a
penalized least squares, it is a combinatorial search done greedily.

Take λ from 1 downwards and narrate the path. At λ = λmax the solution is EXACTLY
zero — not small, zero, and that threshold is known in closed form. Then lines
appear one by one, in the order the greedy chose them, which is not a coincidence.

Then look at the two stems. The blue ones are the lasso's amplitudes and they are
SHORT; the green ones are the same frequencies refitted by ordinary least
squares. The gap is the price of the penalty and it is exactly 2λ/N — the same λ
that selected the lines also shrinks them. "Debiasing the lasso" is nothing more
than the green stems: keep the support, throw the penalty away, refit.

On "What the algorithm sees", the green horizontal is λ and the correlation curve
is CAPPED by it, touching it exactly on the active lines. That is the optimality
condition of the convex problem — the exact counterpart of OMP's notches. Both
algorithms stop for a reason; this is what each reason looks like.

One more thing the convex road has and the greedy one does not, if there is time:
the drawer's α is the FISTA step in units of the certified 1/L, and L is known
here in closed form (nfft/2) with no line search. Raise α above 1 and the step
count in the statline FALLS — the certified step is not the fastest, it is what
the proof needs. Somewhere below α = 2 it says DIVERGED. And while it converges
the ANSWER never moves: same lines, same amplitudes, because the problem is
convex and has one minimum. Put that beside the greedy scene, where the answer IS
the path taken.`,
  },
  {
    id: 'resolution',
    title: 'Δf = 0.5 — where MUSIC wins and this does not',
    view: 'spectrum',
    params: { ...BASE, df: 0.5, k: 2, zoom: 'lines' },
    visible: ['zoom', 'df', 'over'],
    notes: `THE scene, and the reason this experiment sits after the
high-resolution methods rather than before.

This is the one scene zoomed onto the pair — six hertz is the whole question
here, and the whole band cannot show it. The window pill says so, and turning it
back to the whole band is worth doing once at the end, to see that the atoms
this failure produces are not somewhere else: they are right there, on either
side of the pair.

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
    id: 'offgrid',
    title: 'Off the grid, nothing is sparse',
    view: 'spectrum',
    params: { ...BASE, k: 2, snr: 40 },
    visible: ['offGrid', 'k'],
    notes: `Freeze (F) on the grid, then flip the switch: the lines now fall
exactly between two atoms, which is the worst they can do.

Two lines still, two iterations still, and the spectrum tells the story: a
frequency that is not in the dictionary is not represented by one column, it
LEAKS onto all of them. The stems scatter around the truth instead of landing on
it, and the time tab shows the residual barely moving. The signal is not sparse
in this dictionary — sparsity was never a property of the signal, it was an
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
