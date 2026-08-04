// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'correlation',
    title: 'ρ tilts the cloud',
    params: { rho: 0.6, N: 500 },
    visible: ['rho', 'N'],
    notes: `Slide ρ from −0.95 to 0.95: the cloud flattens along a line, and the
ellipses (the EXACT level curves of the pdf) follow.
ρ = 0: ellipses aligned with the axes — independence (in the Gaussian case!).
Hammer R: the cloud changes, the ellipses do not — model against data.
1σ, 2σ, 3σ hold ≈ 39 %, 86 %, 99 % of the points.`,
  },
  {
    id: 'regression',
    title: 'Regression ≠ principal axis',
    params: { rho: 0.6, sigmax: 1.5, sigmay: 1.5, N: 1000 },
    visible: ['rho'],
    notes: `Two lines in the cloud: the major axis (purple) and E[Y|X=x] (green).
The green one is FLATTER — that is regression to the mean:
at extreme X, Y falls back toward μᵧ. Question: "when do they coincide?"
(|ρ| → 1). Lower ρ: the green line flattens toward horizontal, the major axis
does not.`,
  },
  {
    id: 'marginals',
    title: 'The marginals ignore ρ',
    params: { rho: 0.9, sigmax: 1.5, sigmay: 1 },
    view: 'marginals',
    visible: ['rho'],
    notes: `Move ρ from −0.95 to 0.95: NOTHING moves. All the dependence lives in
the joint distribution, invisible from the marginals.
Go back to the Cloud view for the contrast, then ask:
"are two Gaussian marginals enough to pin down the joint distribution?" No.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
