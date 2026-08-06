// Lecture script — auto-discovered by the registry.
// PLAN — context 1 · method 2-5
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'through',
    title: 'The signal goes in, the signal comes out',
    view: 'response',
    params: { source: 'square', f0: 110, fc: 500, Q: 2, output: 'lp' },
    visible: ['fc', 'output'],
    notes: `Two multiplications per sample, and the square wave rounds off.
Moving f_c changes the shape of the output live, and switching output —
low-pass, high-pass, band-pass, notch — costs nothing extra, which is the whole
point of the state-variable structure.

The question before changing tab: which output still looks like a square wave?
The high-pass, which keeps the corners and throws away the slope.`,
  },
  {
    id: 'sculpt',
    title: 'Sculpting the harmonics',
    view: 'gain',
    params: { source: 'square', f0: 110, fc: 500, Q: 2, output: 'lp' },
    visible: ['fc', 'output'],
    notes: `The low-pass curve is 1 up to f_c and then collapses. The input square
wave is a comb of odd harmonics at 110, 330, 550 and 770 Hz, and each one is
MULTIPLIED by the value of the curve at its frequency — that is all a filter
does, harmonic by harmonic, and the harness verifies it to 1e-6.

The exercise is worth doing out loud: at f_c = 500 Hz, which ones survive? Then
back to the time view for the rounded square that results. Taking f_c below
330 Hz leaves only the fundamental — a sine.`,
  },
  {
    id: 'resonance',
    title: 'Resonance sings',
    view: 'gain',
    params: { source: 'saw', f0: 110, fc: 550, Q: 12, output: 'lp' },
    visible: ['fc', 'Q'],
    notes: `At Q = 12 there is a +20 dB bump at f_c, and whichever harmonic passes
under it is thrown forward. Sliding f_c slowly from 300 to 1200 Hz sweeps the
bump across the harmonics one at a time — which is exactly the gesture of a
synthesizer filter, the "wah" being f_c moving and nothing else.

Back in the time view the ringing at f_c settles into the waveform, and the
impulse response says the same thing: an oscillation that takes longer to die
the higher Q is.`,
  },
  {
    id: 'four',
    title: 'Four filters for two multiplications',
    view: 'gain',
    params: { source: 'square', f0: 110, fc: 600, Q: 2, output: 'lp' },
    visible: ['output', 'Q', 'fc'],
    notes: `The Chamberlin structure costs TWO multiplications per sample and
gives all four outputs at once — low-pass, band-pass, high-pass and notch.

Freeze (F), then walk the "output" pill through the four. The orange response
swings from low-pass to band-pass to high-pass to notch, the purple input
spectrum never moves, and the blue output spectrum follows the orange curve
every time. Nothing else changed: not f_c, not Q, not a single coefficient.
Same poles, four numerators — the four filters are four TAPS of one loop, not
four filters.

Then raise Q and watch all four sharpen around the same f_c, one at a time.
That is why the SVF has ruled synthesizers since the 1980s.`,
  },
  {
    id: 'notch',
    title: 'The surgical notch',
    view: 'gain',
    params: { source: 'square', f0: 110, fc: 330, Q: 8, output: 'notch' },
    visible: ['fc', 'Q'],
    notes: `The notch curve dives exactly at f_c, a property of the choice
f₁ = 2·sin(πf_c/Fs) that the harness verifies. Placed at 330 Hz it lands on the
third harmonic of the square wave, which DISAPPEARS.

In the time view the square is barely altered — one harmonic weighs almost
nothing in the shape. Raising Q sharpens the notch and lets its neighbours
breathe. This is the 50 Hz rejection filter of every measuring instrument.`,
  },
];
