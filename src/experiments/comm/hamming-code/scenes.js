// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'syndrome',
    title: 'One error per frame: free',
    params: { code: 'hamming74', ebn0Db: 5, Nbits: 20000 },
    visible: ['code', 'ebn0Db'],
  },
  {
    id: 'crossover',
    title: 'The crossover: coding can lose',
    params: { code: 'hamming74', ebn0Db: 2, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
  },
  {
    id: 'repetition',
    title: 'Repetition, a plausible bad idea',
    params: { code: 'repetition3', ebn0Db: 5, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
  },
];
