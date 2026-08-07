// Lecture script. Auto-discovered by the registry.
//
// Written to be played right after `comm/constellations`: same subject, same
// unit-energy constellations, same Es/N₀, same SER formula. One antenna became
// two, and the whole script is what that costs.
const BASE = { mod: 'qpsk', rho: 0.5, snr: 12, eq: 'zf', N: 1500, seed: 34 };

// PLAN — context 1-2 · problem 3-4 · method 5-6
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'in-time',
    title: 'What makes this not an AWGN link',
    params: { mod: 'qpsk', rho: 0.5, snr: 14, N: 1500, eq: 'zf' },
    view: 'time',
    visible: ['rho', 'eq', 'snr'],
  },
  {
    id: 'mixture',
    title: 'Two symbols at once, and two mixtures',
    view: 'antennas',
    params: { ...BASE, rho: 0.5 },
    visible: ['rho', 'eq', 'snr'],
  },
  {
    id: 'orthogonal',
    title: 'ρ = 0: two AWGN channels, and nothing more',
    view: 'ser',
    params: { ...BASE, rho: 0 },
    visible: ['rho', 'snr', 'eq'],
  },
  {
    id: 'price',
    title: 'The price of forcing to zero',
    view: 'streams',
    params: { ...BASE, rho: 0.8, eq: 'zf' },
    visible: ['rho', 'eq', 'snr'],
  },
  {
    id: 'mmse',
    title: 'MMSE trades a little interference for less noise',
    view: 'streams',
    params: { ...BASE, rho: 0.8, eq: 'mmse', snr: 8 },
    visible: ['eq', 'snr'],
  },
  {
    id: 'ml',
    title: 'ML never leaves the received space',
    view: 'antennas',
    params: { ...BASE, rho: 0.9, snr: 10 },
    visible: ['rho', 'mod', 'eq'],
  },
];
