// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'families',
    title: 'One specification, four families',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family'],
    notes: `The specification is fixed: 1 dB of ripple, 40 dB of attenuation, one
octave of transition. Cycling through the families while reading the order in
the statline gives Butterworth 8, Chebyshev 5, elliptic 4.

Order is not an abstraction — it is op-amps, capacitors and cost. Which raises
the question worth holding until the last scene: if the elliptic is half the
order, why is Butterworth everywhere?`,
  },
  {
    id: 'tighten',
    title: 'Tightening the specification',
    params: { family: 'ellip', fp: 1000, fstop: 1400, Amax: 0.5, Amin: 60 },
    visible: ['fstop', 'Amin'],
    notes: `A 1.4× transition at 60 dB is met by an elliptic of order 6.
Freezing and moving f_a to 1200 Hz takes it to 8.

Every decibel of specification is paid for in order, and the validation rule
blocks the computation when the demand becomes unreasonable rather than
returning a meaningless filter. The parameters drawer shows the derived
selectivity alongside.`,
  },
  {
    id: 'geometry',
    title: 'The geometry of the families',
    view: 'poles',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family'],
    notes: `Butterworth puts its poles on a CIRCLE. Chebyshev 1 flattens that
circle into an ellipse. Chebyshev 2 and the elliptic add ZEROS on the jω axis,
and those zeros are what dig the notches into the stop band.

Fewer poles, better placed, plus zeros: that is the whole history of filter
design in one figure.`,
  },
  {
    id: 'price',
    title: 'What selectivity costs',
    view: 'delay',
    params: { family: 'butter', fp: 1000, fstop: 2000, Amax: 1, Amin: 40 },
    visible: ['family'],
    notes: `This answers the question left open in scene 1. Freezing the group
delay of the Butterworth shows it nearly flat; switching to the elliptic sends
it soaring near f_p, so components close to the band edge arrive LATE. That is
phase distortion, and it wrecks transients.

Selectivity is paid for in phase. As a practical aside, the Inspector exports
the numerator and denominator coefficients — normalized prototype and rad/s —
for Micro-Cap, SPICE or a lab session.`,
  },
];
