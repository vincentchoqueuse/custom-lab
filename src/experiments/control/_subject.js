// `figures` and `figureOrder` are this subject's half of the standard
// vocabulary (core/figures.js): the ids are global, the NAMES and the ORDER
// are the course's.
// Automatique reads a magnitude-and-phase pair as a diagramme de Bode, and
// meets the poles BEFORE the frequency response.
export default {
  title: 'Control',
  order: 10,
  figures: { gain: 'bode', phase: 'bode' },
  figureOrder: ['time', 'response', 'step', 'impulse', 'poles', 'gain', 'phase'],
};
