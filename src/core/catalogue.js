// WHO MADE THIS, declared once.
//
// The catalogue has one author, and writing that name into 62 manifests would
// be 62 chances to spell it differently and no information at all. It is
// declared here; an experiment writes `author` only where the answer differs —
// a colleague's contribution, a demo adapted from someone else's course.
//
// The licence lives with it because the two are asked in the same breath: a
// reader who wants to know who wrote a demo usually wants to know what they may
// do with it, and AGPL-3.0 is a promise the instrument should be able to state
// on its own screen rather than only in a file at the root of a repository.
//
// PURE data. No DOM, no state — the info panel reads it, and so may anything
// else that one day needs to sign a figure.

export const CATALOGUE = Object.freeze({
  author: 'Vincent Choqueuse',
  affiliation: 'ENIB',
  licence: 'AGPL-3.0',
});
