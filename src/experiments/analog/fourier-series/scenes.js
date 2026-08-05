// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'harmonics',
    title: 'A square wave, harmonic by harmonic',
    view: 'time',
    params: { wave: 'square', N: 1, A: 1 },
    visible: ['N', 'wave'],
    notes: `Starting at N = 1 gives a plain sinusoid of the same frequency.
Raising N one notch at a time — 3, 5, 7 — lets each odd harmonic sharpen the
edges a little further.

Asking how many harmonics a perfect square needs has an answer worth stating
carefully: infinitely many, and even then not quite, as the next scene shows.
The spectrum view makes the structure explicit — odd orders only, decaying as
1/n.`,
  },
  {
    id: 'gibbs',
    title: 'The Gibbs phenomenon',
    view: 'time',
    params: { wave: 'square', N: 10, A: 1 },
    visible: ['N', 'wave'],
    lock: true,
    notes: `The axes are pinned from the start, so the frame stays put while the
curve moves. Freezing at N = 10 and pushing to N = 60 draws the oscillations
tighter against the discontinuity — but the OVERSHOOT does not shrink, and the
statline stays near 9 % (8.95 % in theory) whatever N is.

The moral is precise: the convergence is in mean square, not uniform. This is
the reason for the ringing near edges in every band-limited system, from steep
filters to spectral truncation.`,
  },
  {
    id: 'continuity',
    title: 'Continuity sets the rate',
    view: 'time',
    params: { wave: 'triangle', N: 3, A: 1 },
    visible: ['wave', 'N'],
    notes: `The triangle at N = 3 is already nearly perfect, its coefficients
falling as 1/n², because the signal is CONTINUOUS. Switching to the square wave
at the same N is visibly poor.

The error-versus-N view puts numbers on it: a log–log slope of −3/2 for the
triangle against −1/2 for the square and the sawtooth. The rule worth keeping
is that the smoother the signal, the faster its spectrum decays — a
discontinuity is paid for in harmonics.`,
  },
  {
    id: 'pulse',
    title: 'The pulse train and its sinc envelope',
    params: { wave: 'pulse', N: 40, A: 1, alpha: 0.25 },
    view: 'spectrum',
    visible: ['alpha', 'wave'],
    lock: true,
    notes: `This is the signal that shows WHERE the coefficients come from: the
lines SAMPLE an envelope, drawn in orange, and that envelope is a cardinal
sine, 2Aα·sinc(nα).

The missing orders locate it — at α = 0.25 the zeros fall at n = 4, 8, 12, that
is at k/α, the value shown in the drawer. Reducing α spreads the zeros apart
and demands more and more harmonics: a short pulse costs bandwidth. Which α
gives the widest spectrum is a question the dial answers.`,
  },
  {
    id: 'duty-half',
    title: 'α = 1/2: the square wave returns',
    params: { wave: 'pulse', N: 40, A: 1, alpha: 0.5 },
    view: 'spectrum',
    visible: ['alpha', 'wave'],
    notes: `Setting α to exactly 0.50 sends every EVEN order to zero, leaving the
odd ones decaying as 1/n — the spectrum of the square wave, up to a factor of
two (the pulse swings by A, the square by 2A) and up to the mean value, the
n = 0 line worth Aα.

The square wave is therefore not a separate object: it is the pulse train at
duty cycle one half. Coming back from 0.5 toward 0.1 resurrects the even orders
one by one.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
