// The subject comes AFTER regression and filtering, deliberately: neither PCA
// nor a neural network is a new object for someone arriving from signal
// processing. The first is an eigendecomposition of a covariance matrix — the
// same one as in high-resolution spectral analysis; the second is a
// composition of matrix–vector products and a nonlinearity.
//
// The experiments therefore take the signal-processing angle rather than the
// computer-science one: what an activation does to a SPECTRUM, what a Toeplitz
// matrix really is, what an eigenvalue of a covariance measures, and why a
// hidden layer changes the nature of a problem.
//
// "Machine learning" and not "neural networks": PCA is not one, and the
// subject is meant to host k nearest neighbours, SVMs and trees as well, which
// belong to the same course.
//
// Inside, the linear methods come first — a covariance decomposed, then that
// decomposition spent on an image — and the network after: what a nonlinearity
// does, what it buys, and the problem that has no answer without it. A hidden
// layer is worth meeting once it is clear what a purely linear method can and
// cannot do.
export default { title: 'Machine learning', order: 12 };
