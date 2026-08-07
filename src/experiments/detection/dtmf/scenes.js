// Lecture script. Auto-discovered by the registry.
const BASE = { key: '5', ms: 40, snrDb: 10, M: 1600, seed: 34 };

// PLAN — context 1 · method 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'two-tones',
    title: 'A key is two sinusoids',
    view: 'time',
    params: { ...BASE, snrDb: 10 },
    visible: ['key', 'snrDb'],
  },
  {
    id: 'projections',
    title: 'Eight projections, and the floor',
    view: 'amplitudes',
    params: { ...BASE, snrDb: 5 },
    visible: ['snrDb', 'ms'],
  },
  {
    id: 'keypad',
    title: 'Sixteen scores, one decision',
    view: 'keypad',
    params: { ...BASE, snrDb: 0 },
    visible: ['snrDb', 'key'],
  },
  {
    id: 'laws',
    title: 'Rayleigh against Rice',
    view: 'laws',
    params: { ...BASE, snrDb: 3, M: 2400 },
    visible: ['snrDb', 'ms'],
  },
];
