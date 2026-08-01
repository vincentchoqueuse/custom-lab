// Generic compute worker: dynamically imports the requested experiment's
// compute.js (discovered via glob — the worker knows no experiment by name).
// Lecture guard #3: every execution is wrapped in try/catch so any exception
// surfaces as an error status — never a silent crash, never a white screen.

const computeModules = import.meta.glob('../experiments/*/*/compute.js');

self.onmessage = async (e) => {
  const { id, expKey, params } = e.data;
  try {
    const loader = computeModules[`../experiments/${expKey}/compute.js`];
    if (!loader) throw new Error(`no compute module for '${expKey}'`);
    const mod = await loader();
    const { observables } = mod.compute(params);
    self.postMessage({ id, ok: true, observables });
  } catch (err) {
    self.postMessage({ id, ok: false, error: String(err?.message ?? err) });
  }
};
