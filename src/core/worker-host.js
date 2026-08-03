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
const GRACE_MS = 150; // see onTimeout: a fired deadline is not proof of a hang
const LATE_MS = 250; // a timer this far past its due time means a blocked loop

let worker = null;
let callback = null;
let seq = 0;
let inflight = null; // {id, expKey, params}
let queued = null; // latest request waiting (only the freshest matters)
let lastPostTime = 0;
let throttleTimer = null;
let computingTimer = null;
let timeoutTimer = null;
let deadlineAt = 0; // when the armed deadline was due, to detect a late timer
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
  arm(TIMEOUT_MS);
}

function arm(ms) {
  deadlineAt = performance.now() + ms;
  timeoutTimer = setTimeout(onTimeout, ms);
}

function clearTimers() {
  clearTimeout(computingTimer);
  clearTimeout(timeoutTimer);
  computingTimer = timeoutTimer = null;
}

function onMessage(e) {
  const { id, ok, observables, error, started } = e.data;
  if (!inflight || id !== inflight.id) return; // stale reply from a superseded task
  if (started) {
    // work has actually begun: restart the deadline from here, so a slow
    // worker boot never counts as a runaway compute
    clearTimeout(timeoutTimer);
    arm(TIMEOUT_MS);
    return;
  }
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

/**
 * The deadline fired — which is NOT proof that the worker is stuck. The
 * worker's reply travels through the same event loop as this timer, so a main
 * thread busy with a cold-start parse or a lazy view chunk delays the reply
 * exactly as much as it delays the deadline: the compute may already be done,
 * its answer waiting in the task queue behind us. Killing there loses a
 * finished result and leaves the plot blank until something else reschedules
 * — the bug that made the spectrogram come up empty on a cold, slow load.
 *
 * A timer that fires LATE is the signature of a blocked loop, not of a
 * runaway compute (which runs in the worker and cannot starve this thread),
 * so we simply re-arm for as long as that keeps happening. Once the timer
 * comes in on time, one grace turn lets any queued reply land before we
 * declare anything.
 */
function onTimeout() {
  if (performance.now() - deadlineAt > LATE_MS) {
    arm(GRACE_MS); // the loop was blocked: give the worker's answer its turn
    return;
  }
  clearTimeout(computingTimer);
  computingTimer = null;
  timeoutTimer = setTimeout(abortRunaway, GRACE_MS);
}

function abortRunaway() {
  if (!inflight) return; // the reply landed while we waited: nothing to kill
  // Lecture guard #2: kill the runaway worker and resurrect a clean one.
  clearTimers();
  const req = inflight;
  worker.terminate();
  worker = null;
  inflight = null;
  spawn();
  callback?.({
    status: 'aborted',
    message: STR.COMPUTE_ABORTED,
    lastValidParams:
      lastValid && req && lastValid.expKey === req.expKey ? lastValid.params : null,
  });
  // a request made while the runaway was running is still wanted: run it on
  // the fresh worker rather than dropping it silently
  pump();
}
