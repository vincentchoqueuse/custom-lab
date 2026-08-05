// OFDM over a frequency-selective multipath channel. The full chain, with
// unitary FFTs (energy preserved on both sides):
//   QPSK on Nc carriers → IFFT → cyclic prefix → h[l] (L taps, exponential
//   power profile, unit energy) → AWGN → drop CP → FFT → one-tap ZF
// When Lcp ≥ L−1 the linear convolution becomes CIRCULAR over the FFT
// window and the channel DIAGONALIZES: Y[k] = H[k]·X[k] + W[k] — each
// carrier sees a flat channel, equalized by ONE division. When Lcp < L−1
// inter-symbol interference leaks back and no SNR can save the carriers
// (error floor — the whole point of the prefix).
// Per-carrier ZF theory used by the checks and the BER view:
//   BER_k = Q(√(|H_k|²·SNR))       (QPSK, Gray, noise enhanced by 1/|H_k|²)
// Exact identities: Σ|h|² = 1 and Parseval (1/Nc)·Σ|H_k|² = Σ|h|².
// PURE, stateless, seeded — runs in a worker; deterministic at fixed seed.
import { mulberry32, gaussFrom } from '../../../core/rng.js';
import { fft, qfunc } from '../../../core/numeric.js';
import { ifft } from '../../../core/dsp.js';

const MAX_CLOUD = 2500; // constellation points kept for display

/** Unitary FFT / IFFT of (re, im) in place. */
function fftU(re, im) {
  fft(re, im);
  const s = 1 / Math.sqrt(re.length);
  for (let i = 0; i < re.length; i++) {
    re[i] *= s;
    im[i] *= s;
  }
}
// UNITARY convention (1/√N on both sides), the one OFDM uses: it preserves
// energy, so a per-subcarrier SNR reads as it stands. The core normalizes by
// 1/N instead — hence the √N that makes up the difference.
function ifftU(re, im) {
  ifft(re, im);
  const s = Math.sqrt(re.length);
  for (let i = 0; i < re.length; i++) {
    re[i] *= s;
    im[i] *= s;
  }
}

/**
 * @param {{Nc: number, L: number, cp: number, snr: number, M: number,
 *          seed: number}} params
 * @returns {{observables: Object}}
 */
export function compute({ Nc, L, cp, snr, M, k: kSel, seed }) {
  const rng = mulberry32(seed);
  const gauss = gaussFrom(rng);

  // multipath channel: L complex Gaussian taps, exponential profile,
  // normalized to unit energy (the SNR stays an honest per-carrier SNR)
  const hr = new Float64Array(L);
  const hi = new Float64Array(L);
  let e = 0;
  for (let l = 0; l < L; l++) {
    const a = Math.exp(-l / 2);
    hr[l] = a * gauss();
    hi[l] = a * gauss();
    e += hr[l] * hr[l] + hi[l] * hi[l];
  }
  const s = 1 / Math.sqrt(e);
  let hEnergy = 0;
  for (let l = 0; l < L; l++) {
    hr[l] *= s;
    hi[l] *= s;
    hEnergy += hr[l] * hr[l] + hi[l] * hi[l];
  }

  // H[k]: unitary-independent channel response (plain FFT of the taps)
  const Hr = new Float64Array(Nc);
  const Hi = new Float64Array(Nc);
  Hr.set(hr);
  Hi.set(hi);
  fft(Hr, Hi);
  const Habs2 = new Float64Array(Nc);
  let parseval = 0;
  for (let k = 0; k < Nc; k++) {
    Habs2[k] = Hr[k] * Hr[k] + Hi[k] * Hi[k];
    parseval += Habs2[k];
  }
  parseval /= Nc;

  const snrLin = 10 ** (snr / 10);
  const sigma = Math.sqrt(1 / snrLin); // complex noise std per carrier
  const inv2 = Math.SQRT1_2;

  // THE TIME-DOMAIN PICTURE, captured over the first two symbols. Everything
  // else in this experiment lives in frequency, which is where OFDM is elegant
  // and where the cyclic prefix is invisible: it was a parameter with a
  // consequence and never an object. These arrays make it one.
  const SPAN = 2; // symbols drawn
  const S = Nc + cp; // one symbol, prefix included
  const txT = new Float64Array(SPAN * S);
  const rxT = new Float64Array(SPAN * S);

  const kRead = Math.min(Math.max(kSel | 0, 0), Nc - 1);
  const errsPerCarrier = new Float64Array(Nc);
  const rawI = [];
  const rawQ = [];
  const eqI = [];
  const eqQ = [];

  const xr = new Float64Array(Nc);
  const xi = new Float64Array(Nc);
  const nTot = Nc + cp + L - 1; // CP'd symbol through the channel
  const yr = new Float64Array(nTot);
  const yi = new Float64Array(nTot);
  const bitsI = new Int8Array(Nc);
  const bitsQ = new Int8Array(Nc);
  // channel tail of the PREVIOUS symbol, spilling into this one — the
  // actual inter-symbol interference a too-short prefix fails to absorb
  const tailR = new Float64Array(Math.max(L - 1, 1));
  const tailI = new Float64Array(Math.max(L - 1, 1));

  for (let m = 0; m < M; m++) {
    // QPSK symbols (Gray: one bit per axis)
    for (let k = 0; k < Nc; k++) {
      bitsI[k] = rng() < 0.5 ? -1 : 1;
      bitsQ[k] = rng() < 0.5 ? -1 : 1;
      xr[k] = bitsI[k] * inv2;
      xi[k] = bitsQ[k] * inv2;
    }
    ifftU(xr, xi);

    // the transmitted samples of this symbol, prefix first — the same formula
    // the channel loop below uses, so the two cannot drift apart
    if (m < SPAN)
      for (let n = 0; n < S; n++) txT[m * S + n] = xr[(n - cp + Nc) % Nc];

    // cyclic prefix + linear convolution with the channel + noise, with the
    // previous symbol's channel tail added at the head (streaming reality)
    yr.fill(0);
    yi.fill(0);
    for (let l = 0; l < L - 1; l++) {
      yr[l] = tailR[l];
      yi[l] = tailI[l];
    }
    for (let n = 0; n < Nc + cp; n++) {
      const src = (n - cp + Nc) % Nc; // first cp samples replay the tail
      const ar = xr[src];
      const ai = xi[src];
      for (let l = 0; l < L; l++) {
        yr[n + l] += ar * hr[l] - ai * hi[l];
        yi[n + l] += ar * hi[l] + ai * hr[l];
      }
    }
    for (let l = 0; l < L - 1; l++) {
      tailR[l] = yr[Nc + cp + l];
      tailI[l] = yi[Nc + cp + l];
    }
    const ns = sigma * inv2;
    for (let n = 0; n < Nc + cp; n++) {
      yr[n] += ns * gauss();
      yi[n] += ns * gauss();
    }

    if (m < SPAN) for (let n = 0; n < S; n++) rxT[m * S + n] = yr[n];

    // receiver: drop the prefix, FFT the window, one-tap ZF per carrier
    const zr = new Float64Array(Nc);
    const zi = new Float64Array(Nc);
    for (let n = 0; n < Nc; n++) {
      zr[n] = yr[cp + n];
      zi[n] = yi[cp + n];
    }
    fftU(zr, zi);

    for (let k = 0; k < Nc; k++) {
      const d = Habs2[k] + 1e-12;
      const er = (zr[k] * Hr[k] + zi[k] * Hi[k]) / d;
      const eq = (zi[k] * Hr[k] - zr[k] * Hi[k]) / d;
      // ONE subcarrier's cloud, over all M symbols — not the first MAX_CLOUD
      // points of a pool over every carrier, which mixed N different channels
      // into one picture and averaged away what the experiment is about.
      if (k === kRead) {
        rawI.push(zr[k]);
        rawQ.push(zi[k]);
        eqI.push(er);
        eqQ.push(eq);
      }
      if (Math.sign(er) !== bitsI[k]) errsPerCarrier[k]++;
      if (Math.sign(eq) !== bitsQ[k]) errsPerCarrier[k]++;
    }
  }

  // measured and theoretical BER (per carrier and averaged)
  const ks = new Float64Array(Nc);
  const berK = new Float64Array(Nc);
  const berThK = new Float64Array(Nc);
  const HdB = new Float64Array(Nc);
  let berTh = 0;
  let errTot = 0;
  let varTot = 0;
  for (let k = 0; k < Nc; k++) {
    ks[k] = k;
    berK[k] = errsPerCarrier[k] / (2 * M);
    const p = qfunc(Math.sqrt(Habs2[k] * snrLin));
    berThK[k] = p;
    berTh += p / Nc;
    errTot += errsPerCarrier[k];
    varTot += 2 * M * p * (1 - p);
    HdB[k] = Math.max(-40, 10 * Math.log10(Habs2[k] + 1e-300));
  }
  const berMeas = errTot / (2 * M * Nc);
  const berSe = Math.sqrt(varTot) / (2 * M * Nc); // SE of the mean (checks)

  /* ---------- the bands that make the prefix an object -------------------- */
  // A band is {x, lo, hi} and NaN breaks it, so ONE observable draws one
  // rectangle per symbol — the same NaN-separator trick the catalogue uses for
  // spaghetti lines. The vertical bounds are deliberately generous: these are
  // regions of the ABSCISSA, and their height carries no meaning.
  // The band's HEIGHT carries no meaning — these mark regions of the abscissa.
  // But it takes part in the auto-scaling all the same, so a generous constant
  // flattens the very signal it is meant to frame. Each band is therefore sized
  // to the trace it sits behind.
  const amp = (a) => {
    let m = 0;
    for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i]));
    return 1.12 * (m || 1);
  };
  const HI_TX = amp(txT);
  const HI_RX = amp(rxT);
  const band = (from, width, HI) => {
    const x = [];
    const lo = [];
    const hi = [];
    for (let m = 0; m < SPAN; m++) {
      const a = m * S + from;
      const b = a + Math.max(width, 0);
      x.push(a, b, NaN);
      lo.push(-HI, -HI, NaN);
      hi.push(HI, HI, NaN);
    }
    return { x: Float64Array.from(x), lo: Float64Array.from(lo), hi: Float64Array.from(hi) };
  };

  const nT = Float64Array.from({ length: SPAN * S }, (_, i) => i);
  const memory = L - 1; // the channel's memory, in samples
  const absorbed = cp >= memory;

  return {
    observables: {
      /* --- time domain: what the prefix IS, and what it buys --- */
      txTime: { x: nT, y: txT },
      rxTime: { x: nT, y: rxT },
      // The prefix, at the head of each symbol, and NOTHING else shaded: the
      // frame boundaries are drawn as verticals instead. A first version also
      // shaded the tail the prefix is a copy of, which was true and unreadable
      // — two bands of the same colour at both ends of a noise-like trace read
      // as decoration rather than as an identity.
      cpBand: band(0, cp, HI_TX),
      cpBandRx: band(0, cp, HI_RX),

      // Where each frame starts, as verticals. This is the "découpage": without
      // them the signal is one continuous noise and the symbol structure — the
      // thing being explained — is invisible.
      frame0: 0,
      frame1: S,
      // and where the channel's transient ENDS, L−1 samples after each start.
      // The prefix is long enough exactly when this line falls inside the
      // orange: one comparison, made by eye, before it is written as L−1 ≤ L_cp.
      trans0: memory,
      trans1: S + memory,

      channel: { x: ks, y: HdB },
      // the carrier being read, as a vertical on both frequency views
      kLine: kRead,
      berMeasured: { x: ks, y: berK },
      berTheory: { x: ks, y: berThK },
      rxRaw: { x: Float64Array.from(rawI), y: Float64Array.from(rawQ) },
      rxEq: { x: Float64Array.from(eqI), y: Float64Array.from(eqQ) },
      ideal: {
        x: Float64Array.from([inv2, -inv2, -inv2, inv2]),
        y: Float64Array.from([inv2, inv2, -inv2, -inv2]),
      },
      hEnergy, // checks: Σ|h|² = 1 exactly
      parseval, // checks: (1/Nc)Σ|H|² = Σ|h|² exactly
      berSe, // checks: derived standard error of the mean BER
      berMeas: { value: berMeas, meta: { label: 'measured BER', precision: 4 } },
      berThAvg: {
        value: berTh,
        meta: { label: 'BER theory (ZF)', precision: 4 },
      },
      // what the selected carrier is worth, next to the constellation showing it
      hSel: {
        value: HdB[kRead],
        meta: { label: `|H_${kRead}|²`, unit: 'dB', precision: 1 },
      },
      berSel: {
        value: berK[kRead],
        meta: { label: 'its BER', precision: 4 },
      },
      // The reading that ties the two pictures together, and the one the room
      // should be able to predict before looking at the constellation.
      absorbed: {
        value: absorbed
          ? `prefix ${cp} ≥ memory ${memory} — the channel is absorbed`
          : `prefix ${cp} < memory ${memory} — ${memory - cp} sample${memory - cp > 1 ? 's' : ''} of ISI leak in`,
        meta: { label: 'prefix' },
      },
    },
  };
}
