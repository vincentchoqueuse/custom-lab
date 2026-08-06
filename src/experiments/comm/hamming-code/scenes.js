// Lecture script. Auto-discovered by the registry.
// PLAN — context 1 · problem 2 · method 3
// (the three beats, and the shapes that escape them: lecture-scenes skill)
export default [
  {
    id: 'syndrome',
    title: 'One error per frame: free',
    params: { code: 'hamming74', ebn0Db: 5, Nbits: 20000 },
    visible: ['code', 'ebn0Db'],
    notes: `Each column is a seven-bit frame — four data bits and three parity
bits, separated by the grey line — and each blue dot is a bit flipped by the
channel.

The columns with a SINGLE blue dot carry no orange error at all: the syndrome
points at the culprit and the decoder corrects it. Orange only appears in
columns with two or more blue dots, and sometimes on a bit the channel never
touched — the decoder, quite sure of itself, corrects the wrong one. Pressing R
and counting the two-dot columns makes the failure rate concrete.`,
  },
  {
    id: 'crossover',
    title: 'The crossover: coding can lose',
    params: { code: 'hamming74', ebn0Db: 2, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
    notes: `At equal Eb/N₀ the seven transmitted bits share the energy of four
useful ones, so the coded channel is WORSE by a rate penalty of
−10·log₁₀(4/7) = 2.4 dB.

Below about 3 dB the purple curve is ABOVE the blue one: the code loses, because
there are too many errors and it corrects the wrong bits. Above it the code
wins, and the gap grows — the gain at a BER of 10⁻⁵ is about 0.6 dB with hard
decoding. The slope changes too, from p to p², so the code doubles the steepness
of the cascade.`,
  },
  {
    id: 'repetition',
    title: 'Repetition, a plausible bad idea',
    params: { code: 'repetition3', ebn0Db: 5, Nbits: 40000 },
    view: 'ber',
    visible: ['code', 'ebn0Db'],
    notes: `The naive idea the room proposes is to repeat three times and vote.
The curve delivers the verdict: repetition ×3 NEVER goes below the uncoded
curve, because a rate penalty of 4.8 dB eats the whole benefit of the vote at
every Eb/N₀.

Switching back to Hamming makes the comparison sharp: the same price per frame,
three parity bits, but four protected bits instead of one. A code is not
redundancy, it is STRUCTURED redundancy, and the structure is what decides. The
sequel writes itself — longer and cleverer, with BCH and LDPC.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
