// Shared plot geometry and typography — the single source of truth for
// DeclarativePlot AND custom experiment views (same canvas, same margins,
// same presentation-mode scaling everywhere).

const W = 760;
const H = 430;
const M = { top: 20, right: 28, bottom: 48, left: 62 };

export const FRAME = {
  W,
  H,
  M,
  iw: W - M.left - M.right,
  ih: H - M.top - M.bottom,
};

export const FONT_UI = 'IBM Plex Sans, system-ui, sans-serif';
export const FONT_MONO = 'IBM Plex Mono, ui-monospace, monospace';

/** Presentation mode (L): strokes ×1.6. */
export const strokeScale = (pres) => (pres ? 1.6 : 1);

/** Presentation mode (L): type ×1.3. */
export const typeScale = (pres) => (pres ? 1.3 : 1);
