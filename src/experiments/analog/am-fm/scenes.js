// Lecture script — auto-discovered by the registry.
// PLAN — TWO ARCS, one per modulation: AM context 1 · problem 2, then FM context 3
// · problem 4. Forcing them into one three-beat plan would hide that the
// experiment covers two subjects.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
//
// PILLS: the mode leads every scene — switching AM ↔ FM in front of the room
// is the experiment's own comparison. Both indices are declared and the bar
// shows the one the mode makes real (visibleIf): k_a in AM, β in FM, swapped
// live when the mode pill flips. Both are set in every scene so the flip
// lands on story values, never on a leaked default.
export default [
  {
    id: 'am-sidebands',
    title: 'AM: the message lives in the sidebands',
    view: 'time',
    params: { mode: 'am', fm: 62.5, ka: 0.5, beta: 0.5 },
    visible: ['mode', 'ka', 'beta', 'fm'],
  },
  {
    id: 'overmod',
    title: 'Overmodulation: the envelope gives it away',
    view: 'time',
    params: { mode: 'am', fm: 62.5, ka: 0.9, beta: 0.5 },
    visible: ['mode', 'ka', 'beta', 'fm'],
  },
  {
    id: 'bessel',
    title: 'FM: the Bessel lines',
    view: 'spectrum',
    params: { mode: 'fm', fm: 62.5, beta: 0.5, ka: 0.5 },
    visible: ['mode', 'beta', 'ka', 'fm'],
  },
  {
    id: 'null',
    title: 'β = 2.405: the carrier vanishes',
    view: 'spectrum',
    params: { mode: 'fm', fm: 62.5, beta: 2.405, ka: 0.5 },
    visible: ['mode', 'beta', 'ka', 'fm'],
  },
];
