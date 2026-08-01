// Core action registry. The Prompt Bar renders the actions declared in the
// manifest by looking them up here; unknown ids (e.g. 'freeze' before phase 3)
// are silently skipped, so the manifest contract never breaks.
// Actions receive a small API object — no direct store import (no cycle).

import { STR } from './strings.js';

export const coreActions = {
  randomizeSeed: {
    id: 'randomizeSeed',
    icon: 'dice',
    label: STR.ACTION_DRAW,
    shortcut: 'R',
    run(api) {
      // Incrementing (not re-randomizing) keeps the URL reproducible after
      // every draw.
      api.setParam('seed', (api.params().seed ?? 0) + 1);
    },
  },
  resetDefaults: {
    id: 'resetDefaults',
    icon: 'rotate-ccw',
    label: STR.ACTION_RESET,
    run(api) {
      api.resetDefaults();
    },
  },
  revealHidden: {
    id: 'revealHidden',
    icon: 'eye',
    label: STR.ACTION_REVEAL,
    run(api) {
      api.reveal();
    },
  },
  freeze: {
    id: 'freeze',
    icon: 'snowflake',
    label: STR.ACTION_FREEZE,
    shortcut: 'F',
    run(api) {
      // Pin the current plot as a gray dashed ghost; toggle clears it.
      // Display state only — never in the URL (not link-reproducible, by
      // design).
      api.toggleFreeze();
    },
  },
};
