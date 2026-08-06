// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · problem 3-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { method: 'bilinear', family: 'butter', n: 4, fc: 1000, Amax: 1,
              source: 'square', f0: 200 },
    visible: ['fc', 'n'],
    notes: `Before any discretization method, the result: the b and a
coefficients computed by the bilinear transform drive a difference equation, and
this is what it returns. A square goes in, a rounded square comes out.

Raising the order n steepens the skirts and rounds the output further.

How this filter was obtained is the question, and the next tabs answer it: its
impulse response, its frequency response against the analog prototype, its poles
and zeros, and the warping that ties the two worlds together.`,
  },
  {
    id: 'match',
    title: 'The prototype goes digital',
    view: 'response',
    params: { method: 'bilinear', family: 'butter', n: 4, fc: 1000, Amax: 1 },
    visible: ['family', 'n'],
    notes: `The digital curve, in blue, sits on the analog prototype, in orange,
across the whole useful band — the statline reads a cutoff of exactly 1000 Hz.

Then it DIVES at Nyquist where the analog response merely rolls off, because the
bilinear transform puts n zeros at z = −1. That is not a defect but the
signature of the method: the entire jω axis has been wrapped onto the unit
circle.`,
  },
  {
    id: 'warping',
    title: 'Forgetting the pre-warping',
    view: 'response',
    params: { method: 'naive', family: 'butter', n: 4, fc: 1000, Amax: 1 },
    visible: ['method', 'fc'],
    notes: `Bilinear without pre-warping at f_c = 1000 Hz gives a cutoff of
948 Hz. Raising f_c to 3000 gives 2204 Hz — an error of 800 Hz.

The warping tab shows why: the tangent departs from the identity as it climbs
toward Nyquist. Freezing and switching pre-warping back on drops the cutoff
exactly onto the target. Pre-warping corrects ONE point only — but it is the
right one.`,
  },
  {
    id: 'zplane',
    title: 'The left half-plane wraps around',
    view: 'poles',
    params: { method: 'bilinear', family: 'butter', n: 6, fc: 1000, Amax: 1 },
    visible: ['n', 'fc'],
    notes: `The analog poles of the left half-plane land INSIDE the unit circle —
stability is preserved, and that is the theorem — while the n zeros pile up at
z = −1.

Raising f_c migrates the poles toward z = −1, spreading the useful band around
the circle. Switching to impulse invariance keeps the same analog poles under a
different map, z = e^{pT}, and there are no zeros at −1 any more.`,
  },
  {
    id: 'aliasing',
    title: 'Impulse invariance and its aliasing',
    view: 'response',
    params: { method: 'impulse', family: 'butter', n: 2, fc: 1000, Amax: 1 },
    visible: ['method', 'n'],
    notes: `h[n] = T·h_a(nT) EXACTLY — that is its definition, and the harness
verifies it to 3e-16.

But near Nyquist the digital response climbs above the analog one: the tail of
the analog spectrum beyond Fs/2 has FOLDED back into the band. Raising n
shortens the tail and the aliasing melts away.

The synthesis question: which method for an audio low-pass, and which one to
preserve a time response? The two answers differ.`,
  },
];
