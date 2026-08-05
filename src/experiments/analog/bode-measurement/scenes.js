// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'scope',
    title: 'What the scope shows',
    params: { system: 'rc', fc: 500, f: 100, sigma: 0.05 },
    visible: ['f'],
    notes: `At f = 100 Hz, well below f_c = 500 Hz, the orange output follows the
input.

Raising f on the dial is the gesture of the lab session: the output shrinks AND
slides to the right. Two numbers are read off the screen — the ratio of the
amplitudes and the time shift, with Δφ = 360°·f·Δt. The entire frequency
response is contained in those two readings, repeated at enough frequencies.`,
  },
  {
    id: 'cutoff',
    title: 'The −3 dB point',
    params: { system: 'rc', fc: 500, f: 500, sigma: 0.05 },
    visible: ['f', 'fc'],
    notes: `At exactly f = f_c the statline reads a gain of −3.01 dB, an output
at 70.7 %, and a phase of −45°.

That is the operational DEFINITION of the cutoff frequency: in the lab one
looks for the point where the output is 0.707 of the input, not for an
asymptote. Freezing and then moving f_c makes the point follow.`,
  },
  {
    id: 'campaign',
    title: 'The measurement campaign',
    view: 'gain',
    params: { system: 'rc', fc: 500, f: 500, sigma: 0.05 },
    visible: ['sigma'],
    notes: `Twenty-five bench measurements, in orange, laid over the theory in
blue. Pressing R gives a slightly different campaign each time, which is the
difference between a measurement and a calculation.

Raising σ raises the useful question: where does the measurement break down
first? Far into the stop band, where the output sinks below the noise. The
noise floor of the scope is what limits the measurable dynamic range, not the
circuit.`,
  },
  {
    id: 'resonance',
    title: 'Resonance',
    view: 'gain',
    params: { system: 'order2', f0: 500, Q: 2, f: 500, sigma: 0.05 },
    visible: ['Q'],
    notes: `The second-order circuit grows a peak at f₀ as Q rises, of height
roughly 20·log₁₀Q. Freezing at Q = 2 and pushing to Q = 15 sharpens it.

The phase tab is where this connects to the rest of the course: the swing from
0 to −180° steepens around f₀, and that signature is what makes phase margin
comprehensible in the control chapter.`,
  },
];
