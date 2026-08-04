// Equalising a channel WITHOUT a training sequence — and what that costs.
//
// The supervised experiment (filtering/adaptive) gives the algorithm a known
// reference d(n) and asks it to match it. Here there is no reference at all:
// the receiver has only what came out of the channel. Godard's Constant Modulus
// Algorithm replaces the missing reference with one piece of prior knowledge —
// A PSK CONSTELLATION HAS A CONSTANT MODULUS — and minimises
//
//   J(w) = E[(|y|² − R₂)²],     R₂ = E|s|⁴ / E|s|²,     y(n) = Σ w_k x(n−k)
//
// so the update is w ← w − μ·y(n)(|y(n)|² − R₂)·x*(n−k). Nothing in it looks at
// what was sent. That is the whole trick, and the whole price.
//
// THREE THINGS THE EXPERIMENT MAKES VISIBLE, and each has its view:
//
//   1. IT WORKS. On QPSK through a dispersive channel, a cloud that started as
//      a blob closes onto four points, with no reference anywhere. The cost
//      curve falls two decades.
//   2. IT CONVERGES UP TO A ROTATION. The cost depends on |y| alone, so
//      J(w·e^{jφ}) = J(w) for EVERY φ — an exact invariance, checked to 1e-12.
//      The constellation therefore lands tilted by an arbitrary angle, and the
//      statline names it. This is why a blind receiver is followed by a phase
//      estimator, or why the bits are differentially encoded.
//   3. THE CONSTANT-MODULUS ASSUMPTION IS A CONDITION, not a preference. On
//      16-QAM there are three distinct moduli, so even a PERFECT equaliser
//      leaves J = E[(|s|² − R₂)²], and that number is not vague: it is EXACTLY
//      0.4224 for the unit-energy 16-QAM, against exactly 0 for any PSK. The
//      cost view draws that floor as a line, and the curve sits on it. The
//      demonstration is a closed form, not an impression.
//
//      The floor splits in two, and the harness pins the split:
//        E[(|s|²−R₂)²] = Var(|s|²) + (E|s|² − R₂)²
//      the SPREAD of the squared modulus, plus the OFFSET between its mean and
//      the constant the algorithm aims at. On the 16-QAM that is 0.32 + 0.1024.
//      Both terms vanish together exactly when the modulus is constant — which
//      is why a PSK, and only a PSK, lets the cost reach zero.
//
// THE ITERATION IS A PARAMETER, as in filtering/adaptive: the whole weight
// trajectory is a pure function of (params, seed), computed in one go, and the
// `n` slider sweeps inside it. The scene stays reproducible through its URL,
// freezable and exportable — which an animation that plays by itself is not.
//
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { constellation } from '../_lib/modulation.js';

const N = 8000; // adaptation iterations
const N_RUNS = 24; // realizations averaged for the cost curve
const SMOOTH = 51; // moving-average window on the learning curve (see below)
const KEEP = 20; // one weight snapshot every KEEP iterations
const N_CLOUD = 1200; // symbols drawn in the constellation view

/**
 * R₂ = E|s|⁴/E|s|², BY ENUMERATION over the constellation rather than by a
 * table: the constellations carry unit average energy, so R₂ is 1 for every PSK
 * and 1.32 for the 16-QAM — and a formula that computes it cannot drift away
 * from the constellation it belongs to.
 */
export function dispersionR2(mod) {
  const pts = constellation(mod);
  let e2 = 0;
  let e4 = 0;
  for (const p of pts) {
    const m2 = p.x * p.x + p.y * p.y;
    e2 += m2 / pts.length;
    e4 += (m2 * m2) / pts.length;
  }
  return e4 / e2;
}

/**
 * The cost a PERFECT equaliser still pays: J = E[(|s|² − R₂)²] over the
 * constellation — 0 for a constant modulus, 0.4224 for the 16-QAM. This is the
 * floor the cost view draws, and it is exact.
 *
 * Note it is the second moment about R₂ and NOT the variance of |s|²: R₂ is
 * E|s|⁴/E|s|², which on the 16-QAM is 1.32 while E|s|² is 1. The two differ by
 * exactly that offset squared, and the harness checks the decomposition.
 */
export function costFloor(mod) {
  const pts = constellation(mod);
  const r2 = dispersionR2(mod);
  let j = 0;
  for (const p of pts) {
    const m2 = p.x * p.x + p.y * p.y;
    j += (m2 - r2) ** 2 / pts.length;
  }
  return j;
}

/** The channel taps, sanitised: finite, non-degenerate, at most 5. */
export function channelTaps(h) {
  const t = (Array.isArray(h) ? h : [1]).slice(0, 5).map((v) => (Number.isFinite(v) ? v : 0));
  return t.some((v) => v !== 0) ? t : [1];
}

/**
 * The channel as the receiver actually meets it: the taps, carried by a carrier
 * whose phase the receiver does not know. h_k·e^{jφ}.
 *
 * Without it the phase ambiguity stays theoretical: a real channel started from
 * a real centre spike keeps the equaliser real, and the residual rotation comes
 * out at a fraction of a degree. The offset is what turns "the CMA cannot see
 * phase" from a sentence into something on screen.
 */
export function carrier(taps, phiDeg) {
  const a = (phiDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return { re: taps.map((t) => t * c), im: taps.map((t) => t * s) };
}

/** Complex convolution of the channel with the complex equaliser. */
export function combined(hre, him, wr, wi) {
  const n = hre.length + wr.length - 1;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let i = 0; i < hre.length; i++)
    for (let k = 0; k < wr.length; k++) {
      re[i + k] += hre[i] * wr[k] - him[i] * wi[k];
      im[i + k] += hre[i] * wi[k] + him[i] * wr[k];
    }
  return { re, im };
}

/**
 * Residual intersymbol interference of a combined response, the standard
 * measure: everything that is not the main tap, relative to it. Zero means a
 * pure delay — the channel is undone.
 */
export function isiOf(re, im) {
  let peak = 0;
  let total = 0;
  for (let i = 0; i < re.length; i++) {
    const p = re[i] * re[i] + im[i] * im[i];
    total += p;
    if (p > peak) peak = p;
  }
  return peak > 0 ? (total - peak) / peak : NaN;
}

/**
 * @param {{mod: string, h: number[], phi: number, L: number, mu: number,
 *          snr: number, n: number, seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ mod, h, phi, L, mu, snr, n, seed }) {
  const taps = channelTaps(h);
  const ch = carrier(taps, phi);
  const pts = constellation(mod);
  const r2 = dispersionR2(mod);
  const floor = costFloor(mod);
  const nTaps = Math.min(Math.max(Math.round(L), 3), 21);

  // Noise power from the SNR: the symbols carry unit average energy by
  // construction, but the CHANNEL changes the received power, so σ² is set
  // against what actually arrives rather than against what was sent.
  let gain = 0;
  for (const t of taps) gain += t * t;
  const sigma = Math.sqrt(gain / 10 ** (snr / 10) / 2); // per quadrature

  const kept = Math.floor(N / KEEP) + 1;
  const wPath = new Float64Array(kept * nTaps * 2); // [re…, im…] per snapshot
  const cost = new Float64Array(N);
  let x0re = null;
  let x0im = null;

  for (let run = 0; run < N_RUNS; run++) {
    const rand = mulberry32(seed + run * 7919);
    const gauss = gaussFrom(rand);

    // the received sequence: symbols through the channel, plus noise
    const xre = new Float64Array(N + nTaps);
    const xim = new Float64Array(N + nTaps);
    const sre = new Float64Array(N + nTaps + taps.length);
    const sim = new Float64Array(N + nTaps + taps.length);
    for (let i = 0; i < sre.length; i++) {
      const p = pts[Math.floor(rand() * pts.length) % pts.length];
      sre[i] = p.x;
      sim[i] = p.y;
    }
    for (let i = 0; i < xre.length; i++) {
      let ar = 0;
      let ai = 0;
      for (let k = 0; k < taps.length; k++) {
        const u = sre[i + taps.length - 1 - k];
        const v = sim[i + taps.length - 1 - k];
        ar += ch.re[k] * u - ch.im[k] * v;
        ai += ch.re[k] * v + ch.im[k] * u;
      }
      xre[i] = ar + sigma * gauss();
      xim[i] = ai + sigma * gauss();
    }

    // CENTER SPIKE initialisation, the standard blind start: no prior on the
    // channel, only the assumption that the useful delay sits in the middle.
    // The CMA cost is NOT convex, so this choice decides which minimum is
    // reached — which is a property to show, not a detail to hide.
    const wr = new Float64Array(nTaps);
    const wi = new Float64Array(nTaps);
    wr[nTaps >> 1] = 1;

    for (let i = 0; i < N; i++) {
      let yr = 0;
      let yi = 0;
      for (let k = 0; k < nTaps; k++) {
        const a = xre[i + nTaps - 1 - k];
        const b = xim[i + nTaps - 1 - k];
        yr += wr[k] * a - wi[k] * b;
        yi += wr[k] * b + wi[k] * a;
      }
      const m2 = yr * yr + yi * yi;
      const err = m2 - r2;
      cost[i] += (err * err) / N_RUNS;

      // w ← w − μ·y(|y|²−R₂)·x*
      const gr = mu * (yr * err);
      const gi = mu * (yi * err);
      for (let k = 0; k < nTaps; k++) {
        const a = xre[i + nTaps - 1 - k];
        const b = xim[i + nTaps - 1 - k];
        wr[k] -= gr * a + gi * b;
        wi[k] -= gi * a - gr * b;
      }
      if (run === 0 && i % KEEP === 0) {
        const off = (i / KEEP) * nTaps * 2;
        for (let k = 0; k < nTaps; k++) {
          wPath[off + k] = wr[k];
          wPath[off + nTaps + k] = wi[k];
        }
      }
    }
    if (run === 0) {
      const off = Math.floor(N / KEEP) * nTaps * 2;
      for (let k = 0; k < nTaps; k++) {
        wPath[off + k] = wr[k];
        wPath[off + nTaps + k] = wi[k];
      }
      x0re = xre;
      x0im = xim;
    }
  }

  /* ---------- the equaliser at the chosen iteration ------------------------ */
  const nIdx = Math.min(Math.max(Math.round(n), 0), N);
  const slot = Math.min(Math.round(nIdx / KEEP), Math.floor(N / KEEP));
  const off = slot * nTaps * 2;
  const wr = wPath.subarray(off, off + nTaps);
  const wi = wPath.subarray(off + nTaps, off + 2 * nTaps);

  /* ---------- the output cloud, and the input cloud beside it -------------- */
  const cx = new Float64Array(N_CLOUD);
  const cy = new Float64Array(N_CLOUD);
  const ix = new Float64Array(N_CLOUD);
  const iy = new Float64Array(N_CLOUD);
  for (let i = 0; i < N_CLOUD; i++) {
    let yr = 0;
    let yi = 0;
    for (let k = 0; k < nTaps; k++) {
      const a = x0re[i + nTaps - 1 - k];
      const b = x0im[i + nTaps - 1 - k];
      yr += wr[k] * a - wi[k] * b;
      yi += wr[k] * b + wi[k] * a;
    }
    cx[i] = yr;
    cy[i] = yi;
    ix[i] = x0re[i + nTaps - 1];
    iy[i] = x0im[i + nTaps - 1];
  }

  /* ---------- the combined response, where the truth is read --------------- */
  const c = combined(ch.re, ch.im, wr, wi);
  const isi = isiOf(c.re, c.im);
  let peak = 0;
  let peakAt = 0;
  for (let i = 0; i < c.re.length; i++) {
    const p = c.re[i] * c.re[i] + c.im[i] * c.im[i];
    if (p > peak) {
      peak = p;
      peakAt = i;
    }
  }
  // The residual rotation: the phase of the dominant tap. The CMA cannot see it
  // — J depends on |y| only — so this angle is arbitrary and REPRODUCIBLE at a
  // fixed seed, which is exactly what makes it teachable.
  const phase = (Math.atan2(c.im[peakAt], c.re[peakAt]) * 180) / Math.PI;

  const idx = new Float64Array(c.re.length);
  const mag = new Float64Array(c.re.length);
  for (let i = 0; i < c.re.length; i++) {
    idx[i] = i;
    mag[i] = Math.hypot(c.re[i], c.im[i]);
  }

  /* ---------- the curves --------------------------------------------------- */
  // The learning curve is an ENSEMBLE MEAN over N_RUNS *and* a moving average
  // over iterations, and it needs both. (|y|²−R₂)² is a FOURTH-order quantity
  // with a heavy tail: averaged over ten runs it is a solid band of noise two
  // decades tall, in which a convergence is simply not visible — the eye reads a
  // flat ribbon and the descent the experiment exists to show is lost. Twenty-
  // four runs plus a 51-point window leave the shape and remove the grass.
  //
  // The window is centred and SHRINKS at the two ends rather than padding, so
  // the first points are the mean of what actually exists there: a curve that
  // started at an artefact of zero-padding would misplace the very moment the
  // algorithm gets going.
  const iter = new Float64Array(N);
  const jCurve = new Float64Array(N);
  const half = (SMOOTH - 1) / 2;
  let run = 0;
  for (let i = 0; i < N; i++) run += cost[i];
  for (let i = 0; i < N; i++) {
    const lo = Math.max(0, i - half);
    const hi = Math.min(N - 1, i + half);
    let acc = 0;
    for (let k = lo; k <= hi; k++) acc += cost[k];
    iter[i] = i + 1;
    // a log ordinate cannot hold a zero, and a PSK cost legitimately reaches the
    // numerical floor, so the curve is floored rather than clipped by the axis
    jCurve[i] = Math.max(acc / (hi - lo + 1), 1e-6);
  }
  const ideal = { x: Float64Array.from(pts, (p) => p.x), y: Float64Array.from(pts, (p) => p.y) };

  return {
    observables: {
      cloud: { x: cx, y: cy },
      received: { x: ix, y: iy },
      ideal,
      cost: { x: iter, y: jCurve },
      // hline: the exact floor of this constellation. On a PSK it is exactly
      // zero, which a logarithmic ordinate cannot draw — so the line is absent
      // rather than faked at the bottom of the frame, and its ABSENCE is the
      // message: there is nothing this constellation forbids the algorithm.
      floorLine: floor > 1e-9 ? floor : NaN,
      nLine: nIdx + 1,
      response: { x: idx, y: mag },

      r2: { value: r2, meta: { label: 'R₂', precision: 3 } },
      floor: {
        value: floor,
        meta: { label: 'floor', precision: 4 },
      },
      costNow: { value: cost[nIdx > 0 ? nIdx - 1 : 0], meta: { label: 'cost', precision: 4 } },
      isi: { value: isi, meta: { label: 'ISI', precision: 4 } },
      phase: { value: phase, meta: { label: 'rotation', unit: '°', precision: 1 } },
      // No label, so it stays out of the statline: the statline holds ONE line
      // and truncates past it, and the delay is a detail the third view shows
      // better than a number ever will. The inspector and the harness read it
      // by name all the same.
      delay: peakAt,
      verdict: {
        value:
          floor > 1e-9
            ? 'moduli are not constant: the floor is structural'
            : isi < 0.05
              ? 'channel undone, up to a rotation'
              : 'still converging, or a poor minimum',
        meta: { label: 'state' },
      },
    },
  };
}

export { N, N_RUNS, KEEP };
