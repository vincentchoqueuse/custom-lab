// standardChecks factories for the numerical correctness harness (check.js).
// The determinism check is mandatory for every experiment.

function numbersOf(raw) {
  const v = raw !== null && typeof raw === 'object' && 'value' in raw && !('x' in raw) ? raw.value : raw;
  if (typeof v === 'number') return [v];
  if (ArrayBuffer.isView(v) || Array.isArray(v)) return Array.from(v, Number);
  if (v !== null && typeof v === 'object' && 'x' in v && 'y' in v)
    return [...Array.from(v.x, Number), ...Array.from(v.y, Number)];
  return null;
}

export const standardChecks = {
  /**
   * Two runs at the same params (same seed) must produce identical values.
   * @param {(params: object) => {observables: object}} compute
   * @param {object} params — must include a seed
   * @param {string} observableName
   */
  determinism(compute, params, observableName) {
    return {
      name: `determinism: '${observableName}' identical at fixed seed`,
      category: 'numeric',
      run() {
        const a = numbersOf(compute({ ...params }).observables[observableName]);
        const b = numbersOf(compute({ ...params }).observables[observableName]);
        if (a === null || b === null)
          return { ok: false, detail: `observable '${observableName}' is not numeric` };
        if (a.length !== b.length)
          return { ok: false, detail: `length mismatch ${a.length} ≠ ${b.length}` };
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i] && !(Number.isNaN(a[i]) && Number.isNaN(b[i])))
            return { ok: false, detail: `first divergence at index ${i}` };
        }
        return { ok: true, detail: `${a.length} values identical` };
      },
    };
  },
};
