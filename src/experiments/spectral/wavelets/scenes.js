// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2 · method 3 · invoice 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'localize',
    title: 'The click the spectrogram smeared',
    view: 'pyramid',
    params: { signal: 'burst', wavelet: 'haar', K: 24 },
    visible: ['signal', 'wavelet'],
  },
  {
    id: 'compress',
    title: 'Blocks: a few dozen coefficients suffice',
    view: 'compression',
    params: { signal: 'blocks', wavelet: 'haar', K: 40 },
    visible: ['K', 'signal'],
  },
  {
    id: 'moments',
    title: 'Two vanishing moments kill a straight line',
    view: 'pyramid',
    params: { signal: 'ramp', wavelet: 'db4', K: 24 },
    visible: ['wavelet', 'signal'],
  },
  {
    id: 'the-pair',
    title: 'Fourier’s best case is Haar’s worst',
    view: 'decay',
    params: { signal: 'sine', wavelet: 'haar', K: 24 },
    visible: ['signal', 'K', 'wavelet'],
  },
];
