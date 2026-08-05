// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'regimes',
    title: 'The three regimes',
    view: 'step',
    params: { K: 1, m: 0.3, w0: 2 },
    visible: ['m'],
    notes: `At m = 0.3 the system rings: oscillations under an exponential
envelope, with 37 % overshoot in the statline and the formula
e^(−mπ/√(1−m²)) beside it.

Freezing and raising m gives 0.7 (a single rebound), 1 (critical — the fastest
WITHOUT overshoot) and 2 (sluggish: two time constants, the slow one dragging).
The ritual question, how to be fast without overshooting, has the answer m = 1 —
and it is a compromise, not a law.`,
  },
  {
    id: 'poles',
    title: 'The poles travel along the circle',
    params: { K: 1, m: 0.3, w0: 2 },
    view: 'poles',
    visible: ['m', 'w0'],
    notes: `Moving m from 0.05 to 1 sends both poles TRAVELLING along the circle
of radius ω₀, their angle with the real axis being cos⁻¹(m). At m = 1 they meet
at −ω₀; beyond it they separate along the real axis, one of them heading toward
zero — the SLOW mode that then dominates.

Moving ω₀ inflates the circle without changing the geometry: ω₀ is the time
scale and m is the SHAPE. Two numbers, and the whole dynamics.`,
  },
  {
    id: 'resonance',
    title: 'Resonance — and identification',
    params: { K: 1, m: 0.2, w0: 2 },
    view: 'gain',
    visible: ['m'],
    notes: `Below m = 0.707, |H| bulges at ωr = ω₀√(1−2m²) with
Mr = K/(2m√(1−m²)) — at m = 0.2 that is Mr ≈ 2.55, or 8 dB above K. Raising m
melts the bump, which vanishes exactly at 0.707.

The link to the electronics course is worth making: measuring K, Mr and ωr on a
real Bode plot is enough to RECOVER m and ω₀. That is identification, the
reverse path of everything done here. One system, three views: time, poles,
frequency.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
