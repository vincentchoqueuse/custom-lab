// Generic compute worker: dynamically imports the requested experiment's
// compute.js (discovered via glob — the worker knows no experiment by name).
// Lecture guard #3: every execution is wrapped in try/catch so any exception
// surfaces as an error status — never a silent crash, never a white screen.

const computeModules = import.meta.glob('../experiments/*/*/compute.js');

self.onmessage = async (e) => {
  const { id, expKey, params } = e.data;
  // The host's deadline must measure the COMPUTE, not the queue: on a cold
  // start the worker itself is still booting (this bundle carries every
  // experiment's compute), which on an old tablet costs seconds. Acking the
  // task lets the host restart its clock from the moment work really begins.
  self.postMessage({ id, started: true });
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
