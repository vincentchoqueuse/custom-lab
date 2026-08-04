// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'at-work',
    title: 'Scene 1 · The filter at work',
    params: { sigw: 0.1, sigv: 1, N: 120 },
    visible: ['sigv', 'sigw'],
    notes: `Pressing R changes the purple measurements while the orange estimate
stays inside its ±3σ tube — and the tube itself does not move, because it does
not depend on the data at all.

That is the question to put to the room: how does the filter know how wrong it
is without ever knowing x? The answer is that the covariance recursion runs on
the model, not on the measurements.`,
  },
  {
    id: 'good-sensor',
    title: 'Scene 2 · Excellent sensor, uncertain model',
    params: { sigw: 0.5, sigv: 0.05, N: 120 },
    visible: ['sigv', 'sigw'],
    notes: `Freezing the previous scene before switching to this one makes the
change of behaviour obvious: the estimate now sticks to the measurements.

The gain view explains it — K∞ is close to 1, so the filter believes its sensor
and distrusts its model. Asking what K should tend to before showing the view
is usually answered correctly, which is a good sign that the trade-off has
landed.`,
  },
  {
    id: 'good-model',
    title: 'Scene 3 · Poor sensor, trusted model',
    params: { sigw: 0.01, sigv: 3, N: 120 },
    visible: ['sigv', 'sigw'],
    notes: `The opposite regime: K∞ is near zero, the estimate is heavily
smoothed, and it lags behind every turn.

K is the dial between trusting the sensor and trusting the model, and the point
worth making is that nobody sets it by hand — the Riccati recursion computes
it from the two noise variances.`,
  },
  {
    id: 'consistency',
    title: 'Scene 4 · The filter knows itself',
    view: 'consistency',
    params: { sigw: 0.1, sigv: 1, N: 500 },
    visible: ['N'],
    notes: `The true error x̂ − x, which is not observable in practice, lives
inside the ±3σ tube the filter predicted on its own. Counting the points
outside gives roughly one in 370, as a Gaussian says it should.

This is the property that makes Kalman usable rather than merely optimal: it
returns an estimate together with a trustworthy error bar.`,
  },
];
