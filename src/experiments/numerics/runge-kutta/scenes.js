// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'euler-inflates',
    title: 'Euler invents energy',
    view: 'trajectory',
    params: { system: 'pendulum', h: 0.1, theta0: 2.5 },
    visible: ['h', 'system'],
    notes: `A large-amplitude pendulum at h = 0.1 s: Euler, in orange, adds
energy at every step, and enough of it that the pendulum eventually goes over
the top — θ runs away and the oscillation becomes a continuous rotation. The
real pendulum swings, in blue, and RK4 follows it exactly at the same step size.

The energy view makes the mechanism explicit: a straight line on a logarithmic
axis is exponential growth. Reducing h calms Euler without curing it, because
the fault is structural — every step leaves along the tangent, on the outside
of a convex orbit. The simulation changed the NATURE of the motion, not merely
its accuracy.`,
  },
  {
    id: 'order',
    title: 'The slope is the order',
    params: { system: 'linear', h: 0.1 },
    view: 'order',
    visible: ['system', 'h'],
    notes: `On log–log axes, dividing h by ten buys a factor of ten for Euler,
a hundred for RK2 and ten thousand for RK4 — slopes of 1, 2 and 4.

The honest comparison is at equal cost, since RK4 pays four evaluations of f
per step, as the drawer counts. Even so, RK4 at h = 0.16 already beats Euler at
h = 0.005 while doing eight times less arithmetic. One intelligent step is
worth a thousand naive ones, which is why RK4/5 is what runs inside scipy and
LTspice.`,
  },
  {
    id: 'second-order',
    title: 'Simulating the second order',
    view: 'trajectory',
    params: { system: 'linear', h: 0.3 },
    visible: ['h', 'theta0'],
    notes: `This is the system of the second-order response experiment, m = 0.2
and ω₀ = 2, now simulated instead of solved. At h = 0.3 s Euler distorts both
the pseudo-period and the damping; pushing h toward 0.4 makes it unstable while
the real system is stable, which is the worst failure available — a simulation
lying about stability itself. RK4 stays faithful.

That closes the loop: when no closed form exists, as for the nonlinear
pendulum, the integrator is all there is, and its order is what decides whether
the answer means anything.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
