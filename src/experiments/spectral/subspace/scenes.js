// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'wall',
    title: 'The Fourier wall',
    view: 'time',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['df', 'N'],
    notes: `Two exponentials separated by 0.5 × Fs/N, in noise at 25 dB. The
periodogram shows only ONE, and the two yellow verticals say where they really
are.

Raising Δf to 1 splits the hump, just barely. Coming back to 0.5 sets up the
question that opens the chapter: what has to change to separate them? The room
will answer N — a longer record. That is true, and it is expensive: separating
0.5 × Fs/N means doubling the acquisition time.

There is another currency. Next tab.`,
  },
  {
    id: 'eigen',
    title: 'Counting the sources',
    view: 'eigen',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['d', 'snr'],
    notes: `The twenty eigenvalues of the covariance, decreasing, in dB. The
structure is immediate: a few large ones, then a plateau. The plateau IS the
noise — all those eigenvalues equal σ², and the green line confirms it.

The number of eigenvalues above the plateau is the number of sources. In
practice that is the only information available for choosing d, and the
statline measures the jump at the cutoff.

Lowering the SNR from 20 dB to 0 and then to −5 raises the plateau and closes
the gap until counting becomes impossible. That is the THRESHOLD of
high-resolution methods: they do not degrade gently, they break.

One remark worth making: at Δf = 0.5 the SECOND signal eigenvalue is already
much smaller than the first. Two very close lines have nearly collinear
steering vectors, which is geometrically the same difficulty as Fourier's — but
here it is read off a number instead of guessed from a hump.`,
  },
  {
    id: 'resolve',
    title: 'The model buys the resolution',
    view: 'pseudo',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['df', 'snr'],
    notes: `The same record, the same second of signal, the same noise — and two
peaks where the periodogram showed one.

All three estimators are on screen: the swept MUSIC curve, the orange
root-MUSIC points and the purple ESPRIT ones. The latter two sweep nothing;
they solve an equation. With no grid there is no resolution limited by a step,
and the statline gives their error in hertz, of the order of a hundredth.

Lowering Δf shows how far it holds — and the answer depends on two other
settings, which is the whole subject:

    Δf = 0.3 needs 30 dB of SNR
    Δf = 0.2 needs 40
    and at M = 12 instead of 32, even 0.5 stops working.

These three numbers are measured, not illustrative. The periodogram, for its
part, never collapses — it stays mediocre whatever is done to it.

That is the bargain: Fourier assumes nothing and resolves nothing better than
Fs/N; MUSIC assumes "d exponentials in white noise" and resolves far better AS
LONG AS the model is true.`,
  },
  {
    id: 'wrong-d',
    title: 'Getting d wrong',
    view: 'pseudo',
    params: { sources: 3, df: 0.5, snr: 25, N: 256, M: 32, d: 3 },
    visible: ['d', 'sources'],
    notes: `Three sources now: the two close ones and one further off. With
d = 3 all three peaks are there.

Then the model gets broken in both directions, with a prediction collected
first.

At d = 2 the question is which one disappears. One of the two close ones: the
signal subspace is too small to hold them all. That failure is blunt and
visible on the curve.

At d = 5 comes a surprise worth living through. The MUSIC curve barely moves,
its spurious ripples staying fifty decibels down — swept MUSIC is FORGIVING of
an overestimated d. But COUNT the points: root-MUSIC and ESPRIT return exactly
d values, so five, and only three are on screen. The other two sit at 444 and
840 Hz, outside a frame that does not move. The statline names them —
"root-MUSIC invention = 509.7 Hz", the largest distance between an estimate and
the nearest true line. At the right d it is 0.1 Hz; at d = 4, 113.8.

The practical lesson is there: a low peak gets noticed, an invented NUMBER does
not. It looks like a result, and it is not even visible if it falls outside the
frame. Which is why d is not chosen by eye — going back to the eigenvalue tab
shows that THERE, and only there, was it readable.`,
  },
  {
    id: 'model',
    title: 'The complete model',
    view: 'model',
    params: { sources: 2, df: 0.5, snr: 25, N: 256, M: 32, d: 2 },
    visible: ['snr', 'd'],
    notes: `Subspace methods return FREQUENCIES and nothing else. One knows where
the lines are and not what they are worth, so the signal cannot be
reconstructed and there is no way to say whether the model explains the
measurement.

Once the frequencies are known the model becomes LINEAR in its amplitudes:
x ≈ Σ a_k·e^{j2πf_k n}. A 2×2 least squares returns the a_k, and what is left —
the residual — IS the estimate of the noise variance.

THREE spectra are drawn in exactly the same form, lines for the sinusoids and a
level for the noise floor: yellow for the truth (amplitude 1, so 0 dB), orange
for root-MUSIC, purple for ESPRIT. These are the colours of the pseudo-spectrum
view, so nothing has to be relearned between tabs.

In the nominal regime all three coincide, and that IS the result: two
estimators that share no arithmetic, plus the truth, landing in the same place
AND at the same level. The model explains the measurement. Here a cluttered
plot means "all is well", which is rare enough to say out loud.

Then break it, and watch the spectra SEPARATE — which is what makes this view
useful rather than decorative.

At 6 dB of SNR, ESPRIT invents a line at 441 Hz, outside a frame pinned on the
useful band: only ONE purple line remains on screen instead of two, and the
corresponding noise level rises ABOVE the true one. The residual now contains
what the model fails to explain, and the statline says where the other line
went.

At d = 1 an entire source falls into the residual, which explodes — from
−30 dB to +1.4 dB, measured.

At d = 4 two invented lines appear at 444 and 840 Hz. They fall outside the
frame and are NOT visible. Only the statline denounces them ("root-MUSIC
invention = 637.7 Hz"). This is the most dangerous failure mode, because it is
silent.

The point to draw out: knowing the truth was never needed to see that the model
was wrong. The rising noise line is enough — and that is exactly the situation
with a real signal, where the yellow curve does not exist.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
