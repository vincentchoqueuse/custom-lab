// Data-mark palette indirection (cosmetic preference, localStorage only).
// Manifests and custom views keep writing the canonical MATLAB hexes — the
// contract never changes — and the rendering layer remaps them through
// dataColor() according to the user's palette preference. Reactive: pal is
// runes state, so every template or $derived that calls dataColor() updates
// when the preference changes.
import { readPref, writePref } from './prefs.js';

const MATLAB = ['#0072BD', '#D95319', '#EDB120', '#7E2F8E', '#77AC30'];

export const PALETTES = {
  matlab: { label: 'MATLAB', colors: MATLAB },
  okabe: {
    label: 'Okabe-Ito',
    colors: ['#0072B2', '#E69F00', '#F0E442', '#CC79A7', '#009E73'],
  },
  ibm: {
    label: 'IBM',
    colors: ['#648FFF', '#FE6100', '#FFB000', '#785EF0', '#DC267F'],
  },
};

const stored = readPref('dataPalette');
export const pal = $state({ id: stored in PALETTES ? stored : 'matlab' });

export function setDataPalette(id) {
  if (!(id in PALETTES)) return;
  pal.id = id;
  writePref('dataPalette', id);
}

/** Remap a canonical MATLAB data color to the active palette. */
export function dataColor(hex) {
  if (pal.id === 'matlab' || !hex) return hex;
  const i = MATLAB.indexOf(hex);
  return i < 0 ? hex : PALETTES[pal.id].colors[i];
}
