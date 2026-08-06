// Lecture script — auto-discovered by the registry.
// PLAN — TWO ARCS, one per modulation: AM context 1 · problem 2, then FM context 3
// · problem 4. Forcing them into one three-beat plan would hide that the
// experiment covers two subjects.
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'am-sidebands',
    title: 'AM: the message lives in the sidebands',
    view: 'time',
    params: { mode: 'am', fm: 62.5, ka: 0.5 },
    visible: ['ka', 'fm'],
    notes: `Three lines: the carrier at 0 dB and the message, twice, at ±f_m.

Raising k_a moves the sidebands and nothing else, by 20·log10(k_a/2), which the
orange theory points predict. The statline gives the verdict: at k_a = 0.5 some
89 % of the power goes into the carrier, which carries no information
whatsoever. That is the case against amplitude modulation, in one number.`,
  },
  {
    id: 'overmod',
    title: 'Overmodulation: the envelope gives it away',
    view: 'time',
    params: { mode: 'am', fm: 62.5, ka: 0.9 },
    visible: ['ka', 'fm'],
    notes: `Freezing at k_a = 0.9 leaves an orange envelope that reproduces the
message faithfully. Moving to k_a = 1.4 makes the two envelopes CROSS, and an
envelope detector — the diode of a crystal set — would see |envelope|: the
message is folded and cannot be recovered.

That is why k_a ≤ 1, and why AM radio sounds the way it does when the
transmitter is pushed.`,
  },
  {
    id: 'bessel',
    title: 'FM: the Bessel lines',
    view: 'spectrum',
    params: { mode: 'fm', fm: 62.5, beta: 0.5 },
    visible: ['beta', 'fm'],
    notes: `At small β, FM looks like AM: a carrier and two lines. Raising β
slowly grows the lines in pairs, with amplitudes J_n(β) that the orange points
predict, and the spectrum widens.

The statline carries Carson's rule, 2(β+1)f_m, next to the measured 98 %
bandwidth. The question that follows is the design question: with wideband FM,
what is being paid and what is being bought?`,
  },
  {
    id: 'null',
    title: 'β = 2.405: the carrier vanishes',
    view: 'spectrum',
    params: { mode: 'fm', fm: 62.5, beta: 2.405 },
    visible: ['beta', 'fm'],
    notes: `At the first zero of J₀ the carrier disappears entirely, even though
only the phase is being modulated. Moving β by ±0.2 either side brings it back.

This is not a curiosity: it is how FM transmitter deviation used to be
calibrated. The null is found on a spectrum analyser, and Δf = 2.405·f_m
exactly.`,
  },
];
