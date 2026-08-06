// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'step',
    title: 'Type in your system',
    view: 'response',
    params: { num: [1], den: [1, 2, 1], input: 'step' },
    visible: ['num', 'den', 'input'],
    notes: `The num and den pills are EDITABLE: click, then type the coefficients
in decreasing powers of s. Starting from 1/(s+1)² and then improvising with the
room works well — ask for a system and try it. den = 1,0.4,1 rings; den =
1,3,3,1 is a third order; num = 1,1 adds a zero and with it some overshoot.

The URL captures the system, so the same H(s) reaches the whole room as one
link. The final value in the statline is the static gain num(0)/den(0), provided
the system is stable.`,
  },
  {
    id: 'ramp',
    title: 'The ramp measures the lag',
    view: 'response',
    params: { num: [1], den: [1, 2, 1], input: 'ramp' },
    visible: ['den', 'num'],
    notes: `With a static gain of 1 the output eventually follows the ramp — with
a constant LAG. That lag is the VERTICAL gap between the grey input and the blue
output once the transient is over, and it is worth pointing at: e_∞ = 2 s for
1/(s+1)², which is the SUM of the time constants.

Checking it live is quick. den = 1,3,3,1, three poles at −1, takes the gap to 3.
Adding a zero, num = 1,1, brings it back to 2 — zeros produce phase LEAD,
literally. Breaking the static gain with den = 1,2,2 stops the gap from settling
at all: it opens as (1−H(0))·t. The ramp is a stopwatch.`,
  },
  {
    id: 'sine',
    title: 'The living definition of H(jω)',
    view: 'response',
    params: { num: [1], den: [1, 2, 1], input: 'sine', f: 0.5 },
    visible: ['input', 'f'],
    notes: `After the transient, the output is a sinusoid at the SAME frequency,
of amplitude |H(jω)| and shifted by arg H(jω). The statline compares the
measured gain, fitted over the last two periods, with the computed |H(jω)|:
they agree to three decimals.

Raising f melts the gain and dives the phase — a Bode plot point by point, by
hand. This is THE definition of the frequency response, experienced before being
drawn.`,
  },
  {
    id: 'poles',
    title: 'The poles decide, time obeys',
    params: { num: [1], den: [1, 2, 1], input: 'step' },
    view: 'poles',
    visible: ['den', 'input'],
    notes: `The same system, read where everything is decided. Ask before
touching anything: if a pole is slid to the right, what becomes of the step
response?

Then do it, in three edits of den. 1,2,1 gives a double pole at −1 and a clean
slow response. 1,0.4,1 gives complex poles near the axis and ringing, visible on
the impulse tab. 1,-1,1 puts the poles on the RIGHT: the statline says
"unstable" and the response leaves before the sentence is finished.

The crossing is visible on the plane a second before it is visible in time,
which is the whole point of having both readings of the SAME system in
neighbouring tabs.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
