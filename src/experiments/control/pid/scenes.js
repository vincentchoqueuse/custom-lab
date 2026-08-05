// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'p-alone',
    title: 'P alone: fast, but off target',
    view: 'regulated',
    params: { Kp: 3, Ki: 0, Kd: 0, sigma: 0 },
    visible: ['Kp'],
    notes: `With Ki = Kd = 0 the output rises and then stops BELOW the setpoint:
a steady-state error of 1/(1+Kp), which the drawer computes exactly and the
statline measures.

Raising Kp shrinks the error without ever reaching zero, while the oscillations
grow. At t = 10 the load disturbance shifts everything, and P suffers it
permanently. The question that explains it: why can P never finish the job?
Because at zero error u = 0, so nobody is pushing any more.`,
  },
  {
    id: 'integral',
    title: 'I erases everything',
    view: 'regulated',
    params: { Kp: 3, Ki: 1.5, Kd: 0, sigma: 0 },
    visible: ['Ki'],
    notes: `Freezing the P-only curve and adding Ki makes the steady-state error
DISAPPEAR: the integrator accumulates until the error is exactly zero.

At t = 10 the disturbance is absorbed and then ERASED, with the output returning
to the setpoint. That is the real reason the I term exists — steady state, not
speed. Too much Ki and the accumulation overshoots and the oscillations come
back: an integral is a memory, and memory has inertia.`,
  },
  {
    id: 'derivative',
    title: 'D calms — and amplifies noise',
    view: 'regulated',
    params: { Kp: 6, Ki: 1.5, Kd: 1.5, sigma: 0 },
    visible: ['Kd', 'sigma'],
    notes: `With Kp pushed to 6 the loop oscillates. Raising Kd makes the
derivative brake BEFORE the impact and the overshoot melts, as the statline
reports.

Then the other side: set σ = 0.02 of measurement noise and open the control
view. With Kd, u becomes a wild sawtooth — σ(u) in the statline — because the
derivative amplifies noise by roughly Kd/τf. Pressing R changes the noise and
leaves the sawtooth. This is why D is filtered, reduced, or simply absent in
90 % of industrial loops.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
