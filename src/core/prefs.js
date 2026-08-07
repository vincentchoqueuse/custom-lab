// Cosmetic preferences (theme, sidebar, palette) persisted in
// localStorage — NEVER experiment state, which lives in the URL.
// Single owner of the storage keys and of the private-mode try/catch.

// `pupitra:` since the rename. The old `custom-lab:` keys are simply
// abandoned, not migrated: every pref is cosmetic with a sane default, and a
// one-time theme reset for today's handful of users is cheaper than carrying
// a migration forever.
const key = (name) => `pupitra:${name}`;

/** @returns {string|null} */
export function readPref(name) {
  try {
    return localStorage.getItem(key(name));
  } catch {
    return null; // private mode / storage disabled: defaults apply
  }
}

export function writePref(name, value) {
  try {
    localStorage.setItem(key(name), value);
  } catch {
    /* private mode: preference simply not persisted */
  }
}
