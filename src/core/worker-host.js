// Worker host: 30 Hz throttling while dragging + the lecture guard.
// A slider pushed to an extreme in front of 200 students must never freeze
// the screen or crash the app:
//   1. > ~100 ms → status 'computing' (discreet statline indicator, last
//      valid result stays displayed);
//   2. > 1.5 s → terminate the worker, spawn a clean one, restore the last
//      valid params, statline shows the aborted message;
//   3. exceptions inside compute surface as status 'error' (see worker).

import { STR } from './strings.js';
// Vite inline-worker import: the worker ships as a Blob inside the bundle.
// Required for the legacy-only (SystemJS) build, which would otherwise drop
// the separate worker asset emitted by the modern pass; Blob classic workers
// also run on every old Safari. Dev gets a module worker automatically.
import ComputeWorker from './compute.worker.js?worker&inline';

const THROTTLE_MS = 33; // ≈ 30 Hz
const COMPUTING_MS = 100;
const TIMEOUT_MS = 1500;

let worker = null;
let callback = null;
let seq = 0;
let inflight = null; // {id, expKey, params}
let queued = null; // latest request waiting (only the freshest matters)
let lastPostTime = 0;
let throttleTimer = null;
let computingTimer = null;
let timeoutTimer = null;
let lastValid = null; // {expKey, params} of the last successful compute

function spawn() {
  worker = new ComputeWorker();
  worker.onmessage = onMessage;
}

/** Register the single result listener: fn({status, …}). */
export function onResult(fn) {
  callback = fn;
}

/** Request a compute; superseded requests are dropped (only latest runs). */
export function schedule(expKey, params) {
  queued = { expKey, params };
  pump();
}

function pump() {
  if (!queued || inflight) return;
  const wait = THROTTLE_MS - (performance.now() - lastPostTime);
  if (wait > 0) {
    if (!throttleTimer)
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        pump();
      }, wait);
    return;
  }
  const req = queued;
  queued = null;
  post(req);
}

function post(req) {
  if (!worker) spawn();
  inflight = { id: ++seq, ...req };
  lastPostTime = performance.now();
  worker.postMessage({ id: inflight.id, expKey: req.expKey, params: req.params });
  computingTimer = setTimeout(() => callback?.({ status: 'computing' }), COMPUTING_MS);
  timeoutTimer = setTimeout(onTimeout, TIMEOUT_MS);
}

function clearTimers() {
  clearTimeout(computingTimer);
  clearTimeout(timeoutTimer);
  computingTimer = timeoutTimer = null;
}

function onMessage(e) {
  const { id, ok, observables, error } = e.data;
  if (!inflight || id !== inflight.id) return; // stale reply from a superseded task
  clearTimers();
  const req = inflight;
  inflight = null;
  if (ok) {
    lastValid = { expKey: req.expKey, params: req.params };
    callback?.({ status: 'ok', observables, expKey: req.expKey, params: req.params });
  } else {
    callback?.({
      status: 'error',
      message: `${STR.COMPUTE_ERROR}${error ? ' — ' + error : ''}`,
    });
  }
  pump();
}

function onTimeout() {
  // Lecture guard #2: kill the runaway worker and resurrect a clean one.
  clearTimers();
  const req = inflight;
  worker.terminate();
  worker = null;
  inflight = null;
  queued = null;
  spawn();
  callback?.({
    status: 'aborted',
    message: STR.COMPUTE_ABORTED,
    lastValidParams:
      lastValid && req && lastValid.expKey === req.expKey ? lastValid.params : null,
  });
}
