// The frequency FRAMING of the experiment, shared by the computation (the
// periodogram and pseudo-spectrum grids) and by the manifest (the axis domain).
// One place, because two values equal by convention always end up not being so.
//
// It is PINNED, and that is the point: N, Δf, M and d are changed here to watch
// the RESOLUTION move. A framing that followed the Fourier limit would tighten
// exactly as N rose — the two lines would keep the same gap on screen and the
// very effect being shown would vanish. The frame holds, the curve moves. (It is
// the axis lock of `A`, but permanent and by construction: there is no honest
// auto-framing to discover here.)

export const F_LO = 170; // Hz
export const F_HI = 230; // Hz — the two close lines, around F1 = 200
// The third line sits at 330 Hz: with it the window widens, failing which
// "all three peaks are there" would be a third wrong.
export const F_HI_FAR = 350; // Hz

/** The domain of the frequency axis, per configuration. */
export const fWindow = (p) => (Number(p.sources) === 3 ? [F_LO, F_HI_FAR] : [F_LO, F_HI]);

/** The base of the frame of the "estimated spectrum" view, in dB. The noise
 *  rectangles reach exactly down to it, so computation and axis share it. */
export const MODEL_FLOOR = -60;
