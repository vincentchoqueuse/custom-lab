// Lecture script — auto-discovered by the registry.
//
// x AND y are pills on EVERY scene, and never x alone. They name the two axes
// of one picture: turning one without the other is half a gesture, and scene 1
// asks in so many words for "PC3 across, PC4 up", which one dial cannot do.
// They stay under the hand on the scree and reconstruction scenes too — those
// open on another tab, but the cloud is one click away and the room asks for it
// constantly ("and standardized, where do the penguins go?"). Pills that
// survive a tab change are what make that answerable without leaving the scene.
// PLAN — context 1 · method 2-4
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'cloud',
    title: 'Four dimensions, one photograph',
    view: 'scores',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['dataset', 'xComp', 'yComp'],
  },
  {
    id: 'scree',
    title: 'How many to keep',
    view: 'scree',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['k', 'standardize', 'xComp', 'yComp'],
  },
  {
    id: 'standardize',
    title: 'The trap of units',
    view: 'scree',
    params: { dataset: 'penguins', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['standardize', 'dataset', 'xComp', 'yComp'],
  },
  {
    id: 'reconstruction',
    title: 'The theorem, watched',
    view: 'reconstruction',
    params: { dataset: 'iris', standardize: false, k: 2, xComp: 1, yComp: 2 },
    visible: ['k', 'standardize', 'xComp', 'yComp'],
  },
];
