// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'healthy',
    title: 'Reading a healthy eye',
    view: 'time',
    params: { levels: 2, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 200 },
    visible: ['alpha', 'sigma'],
  },
  {
    id: 'isi',
    title: 'The channel closes the eye',
    view: 'eye',
    params: { levels: 2, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 200 },
    visible: ['bt', 'sigma'],
  },
  {
    id: '4pam',
    title: '4-PAM: three eyes stacked',
    view: 'eye',
    params: { levels: 4, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 400 },
    visible: ['levels', 'sigma'],
  },
];
