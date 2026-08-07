// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · method 2-3. Scene 1 is the context despite its title:
// hard decoding is the status quo every receiver already does.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'confidence',
    title: 'Confidence thrown away',
    params: { code: 'hamming74', ebn0Db: 3, Nbits: 40000 },
    visible: ['code', 'ebn0Db'],
  },
  {
    id: 'two-db',
    title: 'Two free decibels',
    params: { code: 'hamming74', ebn0Db: 5, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
  },
  {
    id: 'repetition',
    title: 'Repetition redeemed',
    params: { code: 'repetition3', ebn0Db: 4, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
  },
];
