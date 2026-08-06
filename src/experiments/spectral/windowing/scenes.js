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
    notes: `A sinusoid at 200 Hz and nothing else. The spectrum is not a line: it
is a peak WITH a width and with feet that trail away.

The question to ask first is why a pure frequency does not give a pure
spectrum. Because only N samples are observed, never infinitely many. Taking N
from 256 to 1024 thins the peak — its width is Fs/N, in the statline — and
moving f₁ translates it without changing its shape. Once this picture is
understood, the rest of the experiment follows from it.`,
  },
  {
    id: 'two-tones',
    title: 'Two lines, one width',
    view: 'spectrum',
    params: { win: 'rect', df: 15, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['df', 'N', 'pad', 'a2'],
    notes: `Two sinusoids of equal amplitude, comfortably apart. The width of
each line is Fs/N, shown in the statline, and taking N from 256 to 1024 makes
them visibly thinner.

Two pure frequencies, two lines of finite width: the width belongs to the
observation, not to the signal.`,
  },
  {
    id: 'zero-padding',
    title: 'Zero-padding resolves nothing',
    view: 'spectrum',
    params: { win: 'rect', df: 3, a2: 0, N: 256, pad: 1, f1: 200 },
    visible: ['pad', 'df', 'a2'],
    notes: `With Δf = 3 Hz below Fs/N = 3.9 Hz there is a single hump. The show
of hands is worth taking: with ×16 zero-padding, will two lines appear?

Freezing and switching to ×16 gives a smoother curve and still one hump.
Zero-padding interpolates; it does not invent information. What resolves is N —
going to 1024 separates them.`,
  },
  {
    id: 'hidden-tone',
    title: 'The line hidden under the lobes',
    view: 'spectrum',
    params: { win: 'rect', df: 25, a2: -45, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'a2', 'pad'],
    notes: `A second line at −45 dB is invisible, drowned under the sidelobes of
the rectangular window at −13 dB.

Freezing and moving to Hann, at −31 dB, barely lets it emerge. Blackman, at
−58 dB, reveals it. The window chooses what one is ALLOWED to see.`,
  },
  {
    id: 'tradeoff',
    title: 'Resolution against dynamic range',
    view: 'spectrum',
    params: { win: 'hann', df: 6, a2: 0, N: 256, pad: 4, f1: 200 },
    visible: ['win', 'df', 'pad', 'a2'],
    notes: `Hann has a price: its main lobe is twice as wide. At Δf = 6 Hz with
two equal lines, the rectangular window separates them and Hann merges them
into one.

The "window under the microscope" tab states the rule: a wide main lobe with
low sidelobes, or the converse, and never both. All of windowing is that one
trade-off.`,
  },
];
