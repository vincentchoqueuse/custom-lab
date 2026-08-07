// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-3 · problem 4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'drop',
    title: 'The machine',
    view: 'board',
    params: { D: 12, M: 500, p: 0.5 },
    visible: ['M', 'D'],
  },
  {
    id: 'pascal',
    title: 'The pegs write Pascal’s triangle',
    view: 'histogram',
    params: { D: 12, M: 10000, p: 0.5 },
    visible: ['M', 'D'],
  },
  {
    id: 'bell',
    title: 'The bell keeps its promise at D = 24',
    view: 'histogram',
    params: { D: 24, M: 10000, p: 0.5 },
    visible: ['D', 'p'],
  },
  {
    id: 'skew',
    title: 'A biased board breaks the symmetry',
    view: 'histogram',
    params: { D: 12, M: 10000, p: 0.2 },
    visible: ['p', 'D'],
  },
];
