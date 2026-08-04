// Last of the applications, because it is the one that owes something to all
// the others: constellations in noise are detection, the eye diagram is
// filtering, OFDM is spectral analysis, and equalization is adaptive filtering.
// A subject that composes the rest is met once the rest exists.
//
// Inside: the link first — constellation, BER, the eye, then the two answers to
// a channel that closes it (OFDM, blind equalization) — and coding after,
// because a code protects bits and cannot be discussed before there are bits to
// lose.
export default { title: 'Digital communications', order: 10 };
