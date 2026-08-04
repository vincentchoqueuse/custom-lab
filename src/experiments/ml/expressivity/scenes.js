// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'linear',
    title: 'Scene 1 · Two linear layers make one',
    view: 'time',
    params: { structure: 'dense', act: 'identity', kernel: 9, scale: 1.5, signal: 'sine' },
    visible: ['act', 'structure'],
    notes: `With the identity activation, the blue curve — the network — and the
dashed grey one — the same network without activation — coincide exactly, which
is unsurprising since it is the same computation.

Why that matters is one line of algebra: W₂(W₁x) = (W₂W₁)x, and the product of
two matrices is a matrix. Stacking ten linear layers therefore has the
expressive power of one linear layer, not an iota more, for ten times the
arithmetic. The harness verifies it to 1e-12.

That is the reason activations exist. Switching σ to ReLU separates the two
curves, and the statline measures the gap.`,
  },
  {
    id: 'dense',
    title: 'Scene 2 · Dense: 16 384 weights and no structure left',
    view: 'spectrum',
    params: { structure: 'dense', act: 'relu', kernel: 9, scale: 1.5, signal: 'sine' },
    visible: ['structure', 'signal'],
    notes: `A dense 128 × 128 matrix holds 16 384 independent weights, drawn at
random, and a pure sinusoid goes in.

What comes out is a flat spectrum: every frequency, no line anywhere. That is
what should happen — each output is a combination of ALL the inputs with
unrelated weights, so any notion of temporal neighbourhood has been destroyed.
The network can represent anything, and assumes nothing.

The "Two rows of W₁" tab makes the same point structurally: two rows of the
matrix have nothing in common. Each is its own drawing, learned separately.`,
  },
  {
    id: 'toeplitz',
    title: 'Scene 3 · Toeplitz: 9 weights, and it is a filter',
    view: 'rows',
    params: { structure: 'toeplitz', act: 'relu', kernel: 9, scale: 1.5, signal: 'sine' },
    visible: ['structure', 'kernel'],
    notes: `Switching to Toeplitz while staying on this view, before any talk of
spectra: the two rows are now the SAME row, shifted by 56 positions.

That is what weight sharing means — instead of 128 independent rows, one shape
repeated at every position, 9 weights instead of 16 384, a ratio of 1820 in the
statline.

And it is not a memory saving, it is a HYPOTHESIS about the world: what matters
is local, and does not depend on where it happens. That is exactly the
assumption behind a filter, and exactly the one behind a convolutional layer.

The spectrum tab then shows the consequence: the output spectrum is the input
spectrum multiplied by |H(f)|, the kernel response drawn in orange. The layer
no longer mixes frequencies, it WEIGHTS them, and the harness verifies
Y(f) = H(f)·X(f) to 1e-12. Feeding an impulse closes the argument — the output
IS the impulse response, which is the kernel itself. A convolutional network
does nothing but learn impulse responses.`,
  },
  {
    id: 'width',
    title: 'Scene 4 · The kernel that grows',
    view: 'spectrum',
    params: { structure: 'toeplitz', act: 'relu', kernel: 1, scale: 1.5, signal: 'noise' },
    visible: ['kernel', 'act'],
    notes: `At L = 1 the kernel is a single weight. The layer multiplies by a
constant, |H(f)| is flat, and the network can do nothing in frequency at all. A
1×1 convolution does not mix neighbours, it mixes channels — which is precisely
what it is for in real architectures.

Raising L through 3, 9, 17 and 33 gives the orange response structure, notches
appear, and the output spectrum follows them. The weight count goes from 1 to
33, against 16 384 for the dense layer throughout.

The question worth the session: since the dense matrix contains every Toeplitz
matrix, why not always use dense?

Because what the structure removes is the freedom to learn anything — and
therefore the freedom to be wrong. With 16 384 weights and a hundred examples,
the network memorizes the examples. With 9 it can only learn a filter, and a
filter is what was wanted. Constraining a model is how prior knowledge is
handed to it.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
