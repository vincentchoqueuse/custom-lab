// The STRUCTURE tab, declared once for the whole filtering module.
//
// A frequency response says what a filter does; the structure says what a
// processor has to execute to do it — how many multiplications, how many
// memories, and whether there is a loop. That second question is the one a
// listener asks after "so where do the coefficients go?", and no curve in this
// subject answers it.
//
// It is one figure across the module on purpose: an FIR, a comb and a
// discretized Butterworth are the SAME diagram with different numbers in it,
// and seeing that is most of what the module has to teach about structures.
// The one filter here that is genuinely NOT this diagram — the Chamberlin SVF,
// a two-integrator state loop rather than a single difference equation — keeps
// no structure tab, because drawing it as a direct form would be a lie about
// the very thing that makes it worth two multiplications.
//
// Consumers emit `structB` / `structA` (and optionally `structBulk`); the
// contract is written out in views/Structure.svelte.
import { custom } from '../../../core/views.js';

export function structureView() {
  return custom('structure', 'Structure', () => import('./views/Structure.svelte'));
}
