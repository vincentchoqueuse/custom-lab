// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'staircase',
    title: 'The staircase',
    params: { b: 3, A: 0.9, f: 7.3, dither: false },
    visible: ['b'],
    notes: `At b = 3 there are eight levels and the staircase is impossible to
miss. Freezing and raising b to 8 makes it disappear into the line.

The question worth putting before showing the answer: how many dB of SNR does
each additional bit buy? The statline gives it away, so it should be guessed
first.`,
  },
  {
    id: 'uniform-error',
    title: 'The error is (almost) uniform',
    view: 'error-hist',
    params: { b: 8, A: 0.9, f: 7.3, dither: false },
    visible: ['b'],
    notes: `At b = 8 the histogram sits on the uniform density over ±Δ/2, which
is the assumption behind the familiar Δ²/12.

Dropping b to 2 breaks it: the histogram acquires structure, and the error stops
being a noise at all — it is correlated with the signal. The uniform model is an
APPROXIMATION, valid when Δ is small compared with the signal, and this is where
that condition stops being a formality.`,
  },
  {
    id: 'six-db',
    title: '6 dB per bit',
    view: 'snr',
    params: { b: 8, A: 0.9, f: 7.3, dither: false },
    visible: ['b', 'A'],
    notes: `The measured line follows 6.02b + 1.76 + 20log₁₀A.

Freezing and taking A from 0.9 to 0.45 drops the line by 6 dB: using half the
range wastes a whole bit. The design moral is short — an ADC is meant to be
filled, and getting the input gain right is the entire art.`,
  },
  {
    id: 'dither',
    title: 'Dither, or the noise that helps',
    view: 'error',
    params: { b: 3, A: 0.8, f: 7.3, dither: true },
    visible: ['b', 'dither'],
    notes: `At b = 3 without dither the error is a periodic pattern locked to the
signal, which is distortion rather than noise.

Freezing and switching dither on dissolves the pattern into white noise, at a
cost of about 3 dB of SNR. Pressing R confirms the difference in nature: the
undithered pattern does not change, the dithered noise does. This trade is made
in every audio converter.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
