// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'swings',
    title: 'A pendulum that simply swings',
    view: 'trajectory',
    params: { system: 'pendulum', h: 0.01, theta0: 2.5 },
    visible: ['h', 'theta0'],
  },

  {
    id: 'euler-inflates',
    title: 'Euler invents energy',
    view: 'trajectory',
    params: { system: 'pendulum', h: 0.1, theta0: 2.5 },
    visible: ['h', 'system'],
  },
  {
    id: 'order',
    title: 'The slope is the order',
    params: { system: 'linear', h: 0.1 },
    view: 'order',
    visible: ['system', 'h'],
  },
  {
    id: 'second-order',
    title: 'Simulating the second order',
    view: 'trajectory',
    params: { system: 'linear', h: 0.3 },
    visible: ['h', 'theta0'],
  },
];
