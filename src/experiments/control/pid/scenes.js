// Lecture script. Auto-discovered by the registry.
// PLAN — context+problem 1 · method 2-3. Scene 1 carries both beats: the plant
// closed with a single gain IS the nominal case, and its steady-state error is
// already the problem.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'p-alone',
    title: 'P alone: fast, but off target',
    view: 'regulated',
    params: { Kp: 3, Ki: 0, Kd: 0, sigma: 0 },
    visible: ['Kp', 'Ki', 'Kd'],
  },
  {
    id: 'integral',
    title: 'I erases everything',
    view: 'regulated',
    params: { Kp: 3, Ki: 1.5, Kd: 0, sigma: 0 },
    visible: ['Kp', 'Ki', 'Kd'],
  },
  {
    id: 'derivative',
    title: 'D calms — and amplifies noise',
    view: 'regulated',
    params: { Kp: 6, Ki: 1.5, Kd: 1.5, sigma: 0 },
    visible: ['Kp', 'Ki', 'Kd'],
  },
];
