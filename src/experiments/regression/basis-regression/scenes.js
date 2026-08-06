// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'bumps',
    title: 'A sum of bumps',
    params: { basis: 'rbf', target: 'damped', M: 8, ell: 0.15, lambda: 1e-8, N: 60, sigma: 0.1 },
    view: 'basis',
    visible: ['ell', 'M', 'lambda'],
    notes: `The model is linear — in the weights wⱼ, not in x. It is the same
least squares as polynomial regression, the same closed form, and nothing new
in the algebra. What the view adds is that the orange fit IS the sum of the
eight green bumps, drawn one on top of the other.

Moving ℓ shows both failure modes. Too wide and the bumps merge into one rigid
shape that underfits; too narrow and spikes appear between the data points
while ‖w‖ explodes in the statline — which is where λ rescues the solution,
exactly as ridge did. A good ℓ is visible to the eye: neighbouring bumps
overlap at about half height.`,
  },
  {
    id: 'square-wave',
    title: 'The square wave separates the bases',
    view: 'fit',
    params: { basis: 'fourier', target: 'square', M: 19, ell: 0.05, lambda: 1e-8, N: 150, sigma: 0.02 },
    visible: ['basis', 'M', 'lambda'],
    notes: `One target, four philosophies. Fourier produces the Gibbs
oscillations, and the overshoot is the same ~9 % as in the Fourier series
experiment — the harness checks that the two agree. Polynomials fail globally,
because a polynomial cannot be flat. The RBFs stay clean, their error remaining
local.

The sigmoid basis is the one worth dwelling on: a single function, M = 1, is
enough, because one neuron is an edge detector. The moral is that the basis
must resemble the signal, which is the whole art, and the precise meaning of
the phrase "a prior".`,
  },
  {
    id: 'train-test',
    title: 'The curve that is worth a chapter of ML',
    params: { basis: 'rbf', target: 'damped', M: 8, ell: 0.12, lambda: 1e-8, N: 40, sigma: 0.15 },
    view: 'complexity',
    visible: ['M', 'sigma', 'lambda'],
    notes: `The training error falls forever, because adding functions can only
help fit points that have already been seen. The test error, measured on fresh
data, is U-shaped: the bottom of the U is the right M, and past it the model is
learning the noise. The grey floor is σ², below which nothing can go.

Pressing R moves the bottom of the U a little and the message not at all. This
is the same U as ridge in λ, and as the shrinkage target in λ: the whole
chapter converges here, and machine learning starts on this page.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
