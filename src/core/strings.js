// All core UI strings, centralized as plain English constants.
// Extension point for future i18n of the chrome (principle 7) — pedagogical
// content (titles, labels, notes) never lives here: it belongs to manifests.
export const STR = {
  APP_NAME: 'pupitra',
  REPO_URL: 'https://github.com/vincentchoqueuse/pupitra',
  GITHUB: 'View source on GitHub',
  // The branch the site is built from: a link to the science must point at the
  // code that produced the figure on screen, not at whatever is being written
  // next.
  REPO_BRANCH: 'main',
  // The experiment's DIRECTORY, not one file. Two readers arrive here with two
  // questions: "how is that computed" (the colleague verifying a formula) and
  // "how would I build one of these" (the colleague tempted to contribute).
  // The directory answers both at once, because it IS the pitch: compute,
  // scenes, manifest, checks — four small files, and the core untouched.
  SOURCE_DIR: 'compute · scenes',
  SOURCE_DIR_TITLE:
    'This experiment on GitHub — compute.js, scenes.js, manifest.js, check.js: four files, no core changes',
  SEARCH: 'Search experiments',
  // the landing page (#/ — the catalogue introducing itself)
  CATALOGUE: 'The catalogue',
  LANDING_REPO: 'Source & checks on GitHub',
  EMBED_OPEN: 'Open this scene in the full catalogue',
  LANDING_HINT: 'Open any experiment, then drive it from the keyboard: ←/→ walk the lecture scenes, R draws again, F freezes a ghost for before/after.',
  LANDING_SEARCH: 'Find an experiment — try "Fourier", "Kalman", "noise"…',
  CLEAR_SEARCH: 'Clear the search',
  SEARCH_PLACEHOLDER: 'Type to search experiments…',
  NO_RESULTS: 'No matching experiment',
  PARAMETERS: 'Parameters',
  VIEW_PICKER: 'Representation',
  SCENE: 'Scene',
  ACTION_DRAW: 'Draw',
  ACTION_RESET: 'Reset',
  ACTION_REVEAL: 'Reveal',
  ACTION_FREEZE: 'Freeze',
  FROZEN: 'frozen',
  COPY_LINK: 'Copy link',
  EMBED_CODE: 'Copy embed code — a live iframe of this scene for a course page',
  THEME: 'Theme',
  INSPECTOR: 'Inspector',
  OBSERVABLES: 'Observables',
  DOWNLOAD: 'Download',
  EXPORT_SVG: 'SVG',
  EXPORT_PNG: 'PNG',
  COPY_PNG: 'Copy',
  COMPUTING: 'computing…',
  COMPUTE_ABORTED: '⚠ Computation aborted — values too large',
  COMPUTE_ERROR: '⚠ Computation error',
  VIEW_LOAD_ERROR: '⚠ This view failed to load',
  RETRY: 'Retry',
  SEED: 'Seed',
  LEGEND_TOGGLE: 'click to hide or show this series',
  DERIVED: 'Derived',
  CLOSE: 'Close',
  MASKED_HINT: 'Hidden parameter — use Reveal to unveil',
  LOCK_AXES: 'Lock the axes (A) — the frame stays put while the curve moves',
  AXES: 'Axes',
  CURSOR: 'Cursor',
  READ_VALUES: 'Read the values under the pointer (C)',
  COLLAPSE_SIDEBAR: 'Toggle sidebar',
  SETTINGS: 'Settings',
  QR_CODE: 'QR code',
  DATA_PALETTE: 'Data palette',
  ABOUT: 'About this experiment',
  NO_DESCRIPTION: 'This experiment carries no description yet.',
  LECTURE_OUTLINE: 'Lecture outline',
  THICK_STROKES: 'Thick plot strokes',
};
