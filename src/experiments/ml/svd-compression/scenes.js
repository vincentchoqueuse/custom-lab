// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'phantom',
    title: 'Scene 1 · An image is a matrix',
    view: 'images',
    params: { image: 'phantom', k: 3 },
    visible: ['k'],
    notes: `The Shepp–Logan phantom, the standard test image of medical imaging
since 1974. At 128 × 128 pixels it is a 128 × 128 matrix, so 16 384 numbers.

At k = 3 — three rank-1 layers — the oval is already recognizable. Raising k
slowly through 5, 8, 12 and 20 brings the details back in order of importance,
which is not a figure of speech: the SVD ranked them.

The third tile is the residual, amplified fourfold. It shows what k discarded,
and therefore what the compression costs: edges first, then the small ellipses,
then nothing recognizable at all.

The number to have the room read in the statline: at k = 12, 3084 numbers are
stored instead of 16 384. Five times fewer, for an image whose difference
nobody can see from four metres away.

One remark about the image itself is worth making. It is not a photograph but a
FORMULA — ten ellipses with published parameters — so it is free by
construction, unlike "Lena", the most used test image in the field, which never
was and which the IEEE dropped in 2019.`,
  },
  {
    id: 'spectrum',
    title: 'Scene 2 · What decides is the spectrum',
    view: 'singular',
    params: { image: 'phantom', k: 12 },
    visible: ['image', 'k'],
    notes: `The singular values, on a logarithmic scale, normalized to the first.

They collapse: the twentieth is worth less than a hundredth of the first. That
collapse is what makes compression possible and nothing else does — the SVD
does not compress, it exploits a decay that was already in the image.

The demonstration is made by freezing. Freeze on the phantom, then switch to
"rank 4 by construction": the spectrum falls vertically after the fourth value.
Four layers, and the image is EXACT to 1e-14, which the harness pins.

Then "white noise", still superimposed on the frozen phantom: over the first
forty layers the spectrum falls by a factor of 1.7 where the phantom loses a
factor of 20. No layer is negligible, so nothing is compressible. This is the
most important result of the session, and it is counter-intuitive to anyone who
believes an algorithm "compresses": noise will never be compressed by anyone,
by any method.

Hammering R on the noise is worth a moment — it is the only one of the four
images that draws, so the only one the dice affects. The draw changes and the
plateau does not: this is not a property of THAT particular noise.

The checkerboard belongs at the end, and the room should be made to bet before
it is shown: edges everywhere, detail everywhere, surely the hard case. It has
rank 2. A pixel value is f(row) + g(column) − 2·f(row)·g(column), so the image
is separable and two layers reconstruct it exactly, to 1e-14. The moral is
worth the detour — the eye judges apparent complexity, not rank, and the two
are unrelated.`,
  },
  {
    id: 'exact',
    title: 'Scene 3 · The error is known in advance',
    view: 'energy',
    params: { image: 'phantom', k: 12 },
    visible: ['k', 'image'],
    notes: `The cumulative energy curve, and two numbers in the statline that are
EXACTLY equal: the measured error ‖A − Aₖ‖² and the sum of the squares of the
discarded singular values.

This is neither a bound nor an approximation; it is Eckart–Young, the same
theorem as in the PCA experiment, seen here on an image. It says two things:
no matrix of rank k approximates A better than Aₖ, and the error it will leave
can be computed before it is computed.

The second is what matters in practice — k can be chosen for a target quality
by reading the spectrum, without ever reconstructing anything. The
demonstration: aim for 99 % of the energy on the phantom, read k off the curve,
switch to the image tab and check.

The connection to make out loud: PCA looked for the directions of a cloud, the
SVD looks for the layers of an image, and it is the SAME decomposition. An
eigenvalue of a covariance is a squared singular value. Two courses, one
theorem.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
