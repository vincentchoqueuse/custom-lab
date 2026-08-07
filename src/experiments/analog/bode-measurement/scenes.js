// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'scope',
    title: 'What the scope shows',
    view: 'scope',
    params: { system: 'rc', fc: 500, f: 100, sigma: 0.05 },
    visible: ['f', 'sigma'],
  },
  {
    id: 'cutoff',
    title: 'The −3 dB point',
    view: 'scope',
    params: { system: 'rc', fc: 500, f: 500, sigma: 0.05 },
    visible: ['f', 'fc'],
  },
  {
    id: 'campaign',
    title: 'The measurement campaign',
    view: 'gain',
    params: { system: 'rc', fc: 500, f: 500, sigma: 0.05 },
    visible: ['sigma', 'system'],
  },
  {
    id: 'resonance',
    title: 'Resonance',
    view: 'gain',
    params: { system: 'order2', f0: 500, Q: 2, f: 500, sigma: 0.05 },
    visible: ['Q', 'f0'],
  },
];
