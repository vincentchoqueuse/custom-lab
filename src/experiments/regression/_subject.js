// `figures` and `figureOrder` are this subject's half of the standard
// vocabulary (core/figures.js): the ids are global, the NAMES and the ORDER
// are the course's.
// The fit first, then the law of what was fitted.
//
// Closes the inference block: regression is estimation carried onto a model,
// and the Kalman filter is that same estimation made recursive — hence
// "tracking" rather than "filtering" in the title, which said the right thing
// about Kalman and the wrong thing next to the "Digital filtering" subject
// four lines below it in the sidebar.
export default {
  title: 'Regression & tracking',
  order: 4,
  figureOrder: ['fit', 'time', 'spectrum', 'sampling'],
};
