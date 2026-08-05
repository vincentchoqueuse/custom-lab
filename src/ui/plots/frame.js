// Shared plot geometry and typography — the single source of truth for
// DeclarativePlot, StackPlot, PlanePlot AND custom experiment views (same
// canvas, same margins, same presentation-mode scaling everywhere).
//
// TWO CANVASES: one for a projector, one for a hand.
//
// The wide one is a lecture hall's shape, 16:9, and it is the one every figure
// in this catalogue was designed on. Rendered full width on a 390 px phone it
// comes out 205 px tall — a quarter of the screen for the one thing the screen
// is for, with 350 px of nothing underneath.
//
// The narrow one is 4:3. NOT portrait, and that is a deliberate refusal: a
// frame taller than it is wide would fill the phone completely, and it would
// also make a sinusoid look steep and a Bode slope look like a cliff. The whole
// promise of a demonstration instrument is that the same figure teaches the
// same thing on the projector and in the hand, so the shape moves as little as
// the space allows and no further.
//
// And it is SMALLER IN USER UNITS — 460 wide against 760 — which is the part
// that is easy to miss. Both canvases render at the same physical width, so a
// 12 px label lands at 5.7 real pixels through the wide one and at 9.4 through
// the narrow one. The type did not grow; the ruler shrank.

const M_WIDE = { top: 20, right: 28, bottom: 48, left: 62 };
// Margins are not scaled with the canvas: they hold tick labels and axis names,
// which are the same physical size on both. Trimmed only where the smaller
// ruler makes them genuinely roomier.
const M_NARROW = { top: 14, right: 16, bottom: 42, left: 58 };

const build = (W, H, M) => ({ W, H, M, iw: W - M.left - M.right, ih: H - M.top - M.bottom });

/** The projector canvas, 16:9. The default everywhere. */
export const FRAME = build(760, 430, M_WIDE);

/** The phone canvas, 4:3, drawn on a shorter ruler. */
export const FRAME_NARROW = build(460, 345, M_NARROW);

/**
 * The canvas to draw on. `narrow` is a viewport FACT, held in the store and
 * kept by a single matchMedia listener — never read from `window` here, so a
 * plot stays a pure function of its inputs and the freeze ghost and the SVG
 * export keep cloning something reproducible.
 */
export const frameFor = (narrow) => (narrow ? FRAME_NARROW : FRAME);

export const FONT_UI = 'IBM Plex Sans, system-ui, sans-serif';
export const FONT_MONO = 'IBM Plex Mono, ui-monospace, monospace';

/** Presentation mode (L): strokes ×1.6. */
export const strokeScale = (pres) => (pres ? 1.6 : 1);

/** Presentation mode (L): type ×1.3. */
export const typeScale = (pres) => (pres ? 1.3 : 1);
