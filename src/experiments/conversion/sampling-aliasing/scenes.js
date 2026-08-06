// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2-3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'shannon-ok',
    title: 'All is well (f ≪ Fs/2)',
    view: 'time',
    params: { source: 'sine', f: 5, Fs: 50 },
    visible: ['f', 'Fs'],
    notes: `Five hertz sampled at fifty: the orange curve, reconstructed by sinc
interpolation from the purple points alone, covers the blue one exactly. Below
Fs/2 the samples contain EVERYTHING, and Shannon's theorem is an equality rather
than an approximation.

Raising f gently toward 20 Hz keeps it true even with barely more than two
points per period. The eye refuses to believe it; the reconstruction does not
care.`,
  },
  {
    id: 'wagon-wheel',
    title: 'Aliasing: the wagon wheel',
    view: 'time',
    params: { source: 'sine', f: 45, Fs: 50 },
    visible: ['f', 'Fs'],
    notes: `Forty-five hertz sampled at fifty: the samples trace a 5 Hz signal,
and the reconstruction agrees — the statline reads an apparent frequency of
5 Hz.

Freezing at f = 5 and then moving f to 45 gives THE SAME POINTS. Two different
signals, identical samples: the information is gone, not merely degraded. This
is the wagon wheel of westerns and the moiré of camera sensors. The apparent-
frequency view shows f bouncing off Fs/2 as off a wall.`,
  },
  {
    id: 'harmonics',
    title: 'A square wave folding back',
    params: { source: 'square', f: 15, Fs: 50 },
    view: 'spectrum',
    visible: ['f', 'Fs'],
    notes: `A 15 Hz square wave has harmonics at 45, 75 and 105 Hz, all of them
beyond Fs/2 = 25 Hz. In the spectrum view the true blue lines fold into orange
ones INSIDE [0, 25]: 45 becomes 5 Hz, 75 becomes 25, 105 becomes 5 again.

In the time view the reconstruction is no longer a square wave at all — it has
been contaminated by its own folded harmonics. Hence the rule that filtering
happens BEFORE sampling, never after, and why every converter carries an
anti-aliasing filter.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
