// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'greedy',
    title: 'Scene 1 · Three lines out of 258 unknowns',
    params: { K: 3, sep: 3, offGrid: 0, over: 2, snr: 15, algo: 'omp', k: 0, seed: 34 },
    visible: ['k'],
    notes: `Start at k = 0 and say the shape out loud before touching anything:
128 samples, a dictionary of 258 columns. The normal equations have no unique
solution — there are infinitely many ways to explain this signal exactly. What
picks one is the assumption that only a few columns are used.

Now take k up, one step at a time. Three iterations, three lines, and the
reconstruction on the "Fit" tab lands on the signal.

The question to ask between two steps: how does it choose? Switch to "What the
algorithm sees". That curve is the correlation of the residual with EVERY atom
at once, and it is a single zero-padded FFT — the periodogram of what is left.
The rule is "take the tallest peak and subtract it", which is CLEAN, the
algorithm radio astronomers wrote for exactly this problem.`,
  },
  {
    id: 'denoise',
    title: 'Scene 2 · What the sparsity buys: a denoiser',
    view: 'fit',
    params: { K: 3, sep: 3, offGrid: 0, over: 2, snr: 5, algo: 'omp', k: 3, seed: 34 },
    visible: ['snr', 'k'],
    notes: `Stay on the time view and take the SNR down to 5 dB. The grey trace is
what was measured and it is a mess; the orange dashed one is the signal that was
actually sent.

Then take k from 0 to 3 and watch which of the two the blue lands on. It lands on
the ORANGE. That is the whole argument for a sparse model: with 258 columns
available it could have gone through every grey point exactly — and fitted the
noise doing it — but three columns cannot represent noise, so the only thing it
can reproduce is the part of the data that is structured.

The statline gives the number. The room dialled in 5 dB and the reconstruction
comes out at 21.8 — nearly 17 dB bought with no extra measurement. Ask where it
came from before saying it: the error is the noise projected onto 2k = 6
dimensions out of 128, so only 6/128 of its energy survives, which is
10·log10(128/6) ≈ 13 dB on average. No free lunch anywhere, and this draw is a
good one.

Then push k past 3 and let them watch the gain come back DOWN — 16.8 dB at
k = 3, 10.7 at k = 4, 3.9 at k = 12. Every atom past the third explains no
signal and keeps a little more noise. Choosing k IS the estimation problem, and
this is the same bias-variance trade-off met in polynomial regression, wearing
different clothes.`,
  },
  {
    id: 'orthogonal',
    title: 'Scene 3 · Where the O of OMP is',
    params: { K: 3, sep: 3, offGrid: 0, over: 2, snr: 30, algo: 'omp', k: 2, seed: 34 },
    visible: ['algo', 'k'],
    notes: `Stay on "What the algorithm sees" and look at the frequencies already
taken: the curve has a NOTCH there, straight to the floor. That notch is not
cosmetic — the residual of OMP is orthogonal to every atom it has selected, so
the correlation is exactly zero. The statline reads it as "⟂ defect", and it
prints 0.000000: the number behind it is around 1e-15, which is machine zero
after this many operations and not a small quantity that happens to be small.

Consequence, and it is worth having the room state it before you show it: OMP
can never pick the same atom twice, because a zero can never be the maximum.

Now switch the algorithm to MP. Same selection rule, one difference — MP fits
each line once, against the residual of the moment, and never goes back. The
notches are gone, the orthogonality defect is no longer zero, and "atoms chosen
twice" starts counting. MP spends iterations repairing its own earlier answers.`,
  },
  {
    id: 'coherence',
    title: 'Scene 4 · A finer grid is a HARDER problem',
    params: { K: 2, sep: 1.5, offGrid: 0, over: 1, snr: 30, algo: 'omp', k: 4, seed: 34 },
    visible: ['over', 'sep'],
    notes: `Two lines, one and a half cells apart. At ×1 the atoms are orthogonal
and it works.

Now walk the grid up: ×2, ×4, ×8. Ask for a prediction first — nearly everyone
says a finer grid must help, since the true frequency is better approximated.

Watch what actually happens. The statline's "coherence" is the correlation
between two NEIGHBOURING atoms; it climbs towards 1 as the grid is refined. The
columns of the dictionary stop being distinguishable, the correlation curve
loses its peak, and the greedy choice becomes a coin toss between atoms that
look alike. Greedy never backtracks, so a wrong first pick is a wrong answer.

The lesson is the one worth taking away: the resolution of this method is not
set by the grid. It is set by the data.`,
  },
  {
    id: 'offgrid',
    title: 'Scene 5 · Off the grid, nothing is sparse',
    params: { K: 3, sep: 3, offGrid: 0, over: 2, snr: 30, algo: 'omp', k: 3, seed: 34 },
    visible: ['offGrid', 'k'],
    notes: `Freeze (F) with δ = 0, then take the offset to ½ a cell — the lines
now fall exactly between two atoms.

Three lines still, three iterations still, and the residual barely moves. The
reason is on the spectrum tab: a frequency that is not in the dictionary is not
represented by one column, it LEAKS onto all of them. The signal is not sparse
in this dictionary — sparsity was never a property of the signal, it was an
assumption about the pair (signal, dictionary), and here the pair is wrong.

Take k up to 12 and let the room watch the algorithm spend its whole budget
buying back leakage, one atom at a time.

Worth naming out loud, because it is where the field went next: this is exactly
the "basis mismatch" problem, and the answers to it — a continuous dictionary,
atomic norms, gridless methods — are a research direction and not a tuning
knob.`,
  },
];
