import { compute, FS, N, F1 } from './compute.js';
import { standardChecks } from '../../../core/checks.js';
import { ACTIVATIONS } from '../_lib/nn.js';
import { tone, magSpectrum } from '../../../core/dsp.js';

const BASE = { act: 'relu', signal: 'sine', gain: 1, bias: 0, seed: 34 };

/** Amplitude crête de la raie au bin de f, sur une entrée déjà sur bin. */
const ampAt = (mag, f) => (2 * mag[Math.round((f * N) / FS)]) / N;

export const checks = [
  {
    name: 'ReLU sur sinusoïde : le fondamental vaut EXACTEMENT A/2',
    category: 'numeric',
    run() {
      // Le redressement simple a une série de Fourier fermée. Son
      // fondamental vaut A/2, et il est le SEUL terme que le repliement ne
      // touche pas : les harmoniques créées au-delà de Nyquist reviennent
      // sur des bins pairs (voir le check suivant), jamais sur celui-ci —
      // il faudrait pour cela une harmonique de rang impair, et un
      // redressement n'en produit aucune au-dessus du fondamental.
      const bad = [];
      for (const A of [0.5, 1, 2]) {
        const x = tone(N, F1, { fs: FS, amp: A });
        const y = Float64Array.from(x, (v) => (v > 0 ? v : 0));
        const m = ampAt(magSpectrum(y, { nfft: N }), F1);
        if (Math.abs(m - A / 2) > 1e-12) bad.push(`A=${A} : ${m} vs ${A / 2}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'A/2 à 1e-12 pour A = 0.5, 1, 2',
      };
    },
  },
  {
    name: 'et les harmoniques paires suivent 2A/(π(4k²−1)) — au repliement près',
    category: 'numeric',
    run() {
      // La série exacte du redressement : continue A/π, puis 2A/(π(4k²−1))
      // au rang 2k. Elle ne s'arrête JAMAIS — donc une partie des raies naît
      // au-dessus de Nyquist et se replie dans la bande. C'est mesurable :
      // l'écart à la théorie est de l'ordre de 1e-4, pas de 1e-15, et c'est
      // le repliement, pas une erreur de calcul. Une non-linéarité en temps
      // discret ALIASE toujours ; ce check est là pour le dire.
      const x = tone(N, F1, { fs: FS });
      const mag = magSpectrum(Float64Array.from(x, (v) => (v > 0 ? v : 0)), { nfft: N });
      const rows = [];
      let worst = 0;
      for (const k of [1, 2, 3, 4]) {
        const th = 2 / (Math.PI * (4 * k * k - 1));
        const me = ampAt(mag, 2 * k * F1);
        worst = Math.max(worst, Math.abs(me - th));
        rows.push(`H${2 * k}: ${me.toFixed(5)}/${th.toFixed(5)}`);
      }
      const dc = mag[0] / N;
      worst = Math.max(worst, Math.abs(dc - 1 / Math.PI));
      return {
        ok: worst < 1e-3 && worst > 1e-9,
        detail: `continue ${dc.toFixed(5)}/${(1 / Math.PI).toFixed(5)} · ${rows.join(' ')} · écart max ${worst.toExponential(1)} (repliement)`,
      };
    },
  },
  {
    name: 'une activation IMPAIRE ne crée aucune harmonique paire',
    category: 'numeric',
    run() {
      // La parité de σ se lit directement sur le spectre, et c'est exact :
      // σ impaire ⇒ σ(sin) impaire ⇒ que des rangs impairs. Aucune tolérance
      // statistique ici, c'est une symétrie.
      const x = tone(N, F1, { fs: FS, amp: 1.5 });
      const bad = [];
      for (const act of ['identity', 'tanh']) {
        const { f } = ACTIVATIONS[act];
        const mag = magSpectrum(Float64Array.from(x, f), { nfft: N });
        for (const k of [2, 4, 6]) {
          const a = ampAt(mag, k * F1);
          if (a > 1e-12) bad.push(`${act} H${k} = ${a.toExponential(1)}`);
        }
        if (mag[0] / N > 1e-12) bad.push(`${act} continue = ${(mag[0] / N).toExponential(1)}`);
      }
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : 'identité et tanh : rangs pairs et continue < 1e-12',
      };
    },
  },
  {
    name: 'une couche LINÉAIRE n’invente rien : distorsion nulle',
    category: 'numeric',
    run() {
      // Le contrepoint, et la raison d'être de la scène 4 : sans activation,
      // le spectre de sortie est celui d'entrée, raie pour raie.
      const o = compute({ ...BASE, act: 'identity' }).observables;
      return {
        ok: o.thd.value < 1e-9 && Math.abs(o.gainFund.value - 1) < 1e-12,
        detail: `THD ${o.thd.value.toExponential(2)} % · gain ${o.gainFund.value}`,
      };
    },
  },
  {
    name: 'les dérivées valent leurs valeurs connues en 0',
    category: 'numeric',
    run() {
      // Les quatre nombres que la scène 1 projette. σ′(0) décide de la
      // vitesse d'apprentissage au démarrage, et la sigmoïde plafonne à 1/4
      // — c'est de là que vient le facteur qui s'écrase en profondeur.
      const g = (a) => ACTIVATIONS[a].df(0);
      const bad = [];
      if (Math.abs(g('sigmoid') - 0.25) > 1e-12) bad.push(`sigmoïde ${g('sigmoid')}`);
      if (Math.abs(g('tanh') - 1) > 1e-12) bad.push(`tanh ${g('tanh')}`);
      if (Math.abs(g('identity') - 1) > 1e-12) bad.push(`identité ${g('identity')}`);
      if (Math.abs(g('gelu') - 0.5) > 1e-7) bad.push(`GELU ${g('gelu')}`);
      if (Math.abs(ACTIVATIONS.gelu.f(0)) > 1e-12) bad.push(`GELU(0) ${ACTIVATIONS.gelu.f(0)}`);
      return {
        ok: bad.length === 0,
        detail: bad.length ? bad.join(' · ') : "σ′(0) = 0.25 (sigmoïde), 1 (tanh, identité), 0.5 (GELU)",
      };
    },
  },
  {
    name: 'la saturation étouffe le gradient, et le chiffre est mesuré',
    category: 'numeric',
    run() {
      // Les nombres que la scène 1 projette, épinglés ici pour qu'ils ne
      // puissent pas dériver dans les notes : la dérivée de la sigmoïde vaut
      // 0.25 au mieux, 1.77e-2 à x = 4 et 3.35e-4 à x = 8. ReLU, elle, rend
      // 1 partout où elle rend quelque chose. Le rapport à x = 4 est de 57,
      // pas de mille — l'effondrement vient de l'EMPILEMENT des couches, pas
      // d'un seul étage, et c'est ce qu'il faut dire.
      const sig = (x) => ACTIVATIONS.sigmoid.df(x);
      const bad = [];
      if (ACTIVATIONS.relu.df(4) !== 1) bad.push('ReLU′(4) ≠ 1');
      if (Math.abs(sig(0) - 0.25) > 1e-12) bad.push(`σ′(0) = ${sig(0)}`);
      if (Math.abs(sig(4) - 0.0176627) > 1e-6) bad.push(`σ′(4) = ${sig(4).toExponential(3)}`);
      if (Math.abs(sig(8) - 3.3524e-4) > 1e-8) bad.push(`σ′(8) = ${sig(8).toExponential(3)}`);
      return {
        ok: bad.length === 0,
        detail: bad.length
          ? bad.join(' · ')
          : `σ′ sigmoïde : 0.25 en 0, 1.77e-2 en 4, 3.35e-4 en 8 — ×57 puis ×746 sous ReLU`,
      };
    },
  },
  {
    name: 'deux tons : l’intermodulation croît trois fois plus vite que le signal',
    category: 'numeric',
    run() {
      // La loi du 3 pour 1 : doubler l'entrée monte le fondamental de 6 dB
      // et la raie 2f₁−f₂ de 18. Elle est vraie en PETIT SIGNAL, et le check
      // vérifie les deux moitiés de cette phrase — 2.99 à g = 0.05→0.1,
      // 2.41 seulement à 0.4→0.8, où la compression de tanh a déjà mangé le
      // régime cubique. Une loi asymptotique sans son domaine de validité
      // est une demi-vérité, et c'est le genre de demi-vérité qu'un
      // étudiant applique ensuite hors domaine.
      const at = (gain) => {
        const o = compute({ ...BASE, act: 'tanh', signal: 'two', gain }).observables;
        return { f: o.gainFund.value * gain, i: o.imd3.value };
      };
      const slope = (g1, g2) => {
        const a = at(g1);
        const b = at(g2);
        return [Math.log2(b.f / a.f), Math.log2(b.i / a.i)];
      };
      const [sf, si] = slope(0.05, 0.1);
      const [, siBig] = slope(0.4, 0.8);
      return {
        ok: Math.abs(sf - 1) < 0.03 && Math.abs(si - 3) < 0.05 && siBig < 2.6,
        detail: `petit signal : fondamental ${sf.toFixed(2)}, IMD ${si.toFixed(2)} · fort signal : IMD ${siBig.toFixed(2)} (le régime cubique se referme)`,
      };
    },
  },
  standardChecks.determinism(compute, { ...BASE, signal: 'noise' }, 'yTime'),
];
