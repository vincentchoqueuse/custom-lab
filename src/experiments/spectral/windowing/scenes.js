// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · problem 2-4 · method 5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'one-tone',
    title: 'A single sinusoid',
    view: 'spectrum',
    // the second tone is pushed 80 dB down: the picture is one line, and
    // nothing else, before anything is compared to anything
    params: { win: 'rect', df: 15, a2: -80, N: 256, pad: 1, f1: 200 },
    visible: ['N', 'f1', 'pad', 'a2'],
  },
  {
    id: 'two-tones',
    title: 'Two lines, one width',
    view: 'spectrum',
    params: { win: 'rect', df: 15, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['df', 'N', 'pad', 'a2'],
  },
  {
    id: 'zero-padding',
    title: 'Zero-padding resolves nothing',
    view: 'spectrum',
    params: { win: 'rect', df: 3, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['pad', 'df', 'a2'],
  },
  {
    id: 'hidden-tone',
    title: 'The line hidden under the lobes',
    view: 'spectrum',
    params: { win: 'rect', df: 25, a2: -45, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'a2', 'pad'],
  },
  {
    id: 'tradeoff',
    title: 'Resolution against dynamic range',
    view: 'spectrum',
    params: { win: 'hann', df: 6, a2: 0, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'df', 'pad', 'a2'],
  },
];
