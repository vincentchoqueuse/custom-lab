# Terminology

The catalogue is written in English — chrome, pedagogical content, comments and
commits alike. What follows is not a style guide but a **closed list of choices**:
across 59 experiments, the same quantity must carry the same word in every tab
title, axis label, pill and scene note. A listener who moves from one experiment
to the next should never have to re-learn a name.

When a term is missing here, add it in the same commit that first uses it.

## The rules that override taste

1. **Follow the textbook the course follows.** Oppenheim & Schafer for signals,
   Kay for estimation and detection, Proakis for digital communications, Åström &
   Murray for control, Hastie & Tibshirani for machine learning. Where two of them
   disagree, the subject's own field wins.
2. **Symbols are not translated.** `σ`, `μ`, `1−α`, `N`, `SNR` are the same in
   every language; the `name` field of a param is a symbol, the `description` is
   the English words for it.
3. **Units are never spelled out** — `Hz`, `dB`, `rad`, `s`, `bit/s`.
4. **Sentence case for titles**, not Title Case: "Confidence intervals", not
   "Confidence Intervals". Only proper nouns keep their capital (Bode, Fisher,
   Monte Carlo, Shepp–Logan).
5. **Prefer the concrete word to the Latin one**: "draw" over "realisation",
   "spread" over "dispersion", when both are correct.
6. **British or American?** American, because the literature is: *normalize*,
   *center*, *modeled*, *analog*.

## Symbols: what is a symbol, and what is a word

A param's `name` is what the pill shows. It is either a **symbol** — greek, a
single letter, an acronym: `σ`, `μ`, `Δf`, `N`, `SNR` — or, for a `select` whose
value is a choice rather than a number, a **word**: `window`, `family`,
`method`, `algorithm`, `activation`. The words are a **closed list**, held in
`scripts/run-checks.js` and enforced by `npm run check`, because that is the
slot French crept back into: five param names sat in the interface reading
`algorithme`, `famille`, `méthode`, `étape` and `poursuite` long after the
catalogue was converted, since nobody re-reads a one-word select label.

Two rules settle the recurring ambiguities:

- **`f` when it is the only frequency, `f₀` when there are harmonics.** A lone
  sinusoid being sampled, quantized or truncated has an `f`; the fundamental of
  a square wave or of an FM modulator has an `f₀`.
- **`Fs` is the sampling rate**, everywhere and in that spelling — not `fe`,
  which is *fréquence d'échantillonnage* wearing an English coat, and which one
  experiment carried in its params, its subtitle, its axis labels and its scene
  notes.

### Collisions that are deliberate

The same symbol carries different quantities in different subjects, and that is
the terminology rules working as intended (rule 1: the subject's own field
wins). They are listed here so that nobody "fixes" them later:

| Symbol | Meanings, by subject | Why both stay |
|---|---|---|
| `μ` | true mean (stats, estimation) · step size (adaptive filtering, CMA) | Kay writes one, Haykin the other |
| `λ` | ridge and lasso penalty (regression) · forgetting factor (RLS) · rate (Poisson) | three literatures, three λ |
| `N` | sample size, record length, number of draws — always "how many" | one concept, many clothes |
| `M` | Monte-Carlo replications (stats) · covariance order (spectral) · PAM levels (comm) | never in the same room |
| `Δf` | gap between two lines (spectral) · frequency deviation (FM) · grid step (LS estimation) | standard in each |
| `σ` | noise standard deviation everywhere — and NEVER the activation function, which is a select and therefore carries the word `activation`, even though the ML literature writes σ(·). A pill reading `σ = ReLU` two experiments after `σ = 0.3` is the one collision the catalogue refuses. |

## Core vocabulary

| French | English | Never |
|---|---|---|
| bruit | noise | |
| bruit blanc | white noise | |
| rapport signal à bruit | signal-to-noise ratio (SNR) | signal/noise ratio |
| écart-type | standard deviation | std, std dev |
| variance | variance | |
| moyenne | mean | average (except "moving average") |
| moyenne empirique | sample mean | empirical mean |
| espérance | expectation | expected value in labels (too long) |
| loi | distribution | law |
| loi normale / gaussienne | Gaussian | normal (keep one word for one thing) |
| tirage | draw | sample (a draw yields samples) |
| échantillon | sample | |
| échantillonnage | sampling | |
| fréquence d'échantillonnage | sampling rate | sampling frequency |
| réalisation | realization | run |
| vraie valeur | true value | ground truth |
| estimateur | estimator | |
| biais | bias | |
| EQM (erreur quadratique moyenne) | MSE (mean squared error) | quadratic error |
| borne | bound | limit |
| couverture | coverage | |
| intervalle de confiance | confidence interval | |
| niveau de confiance | confidence level | |
| seuil | threshold | |
| puissance (d'un test) | power | |
| vraisemblance | likelihood | |
| ajustement | fit | adjustment |
| pente | slope | |
| ordonnée à l'origine | intercept | |
| moindres carrés | least squares | |
| régularisation | regularization | |

## Signals, filters and spectra

| French | English | Never |
|---|---|---|
| signal temporel | time signal | temporal signal |
| réponse temporelle | time response | |
| réponse indicielle | step response | |
| réponse impulsionnelle | impulse response | |
| réponse fréquentielle | frequency response | |
| gain / phase | gain / phase | magnitude (reserve for `|H|` in prose) |
| spectre | spectrum | |
| raie (spectrale) | spectral line | ray, peak |
| repliement | aliasing | folding |
| fenêtre | window | |
| troncature | truncation | |
| filtre passe-bas / passe-bande | low-pass / band-pass filter | |
| fréquence de coupure | cutoff frequency | |
| bande passante | bandwidth | pass band (that is *bande passante* of a filter shape) |
| suréchantillonnage | upsampling | oversampling (that is the ratio, not the operation) |
| bourrage de zéros | zero stuffing | zero padding (that is *remplissage*, in the FFT sense) |
| pôles et zéros | poles and zeros | pole map |
| boucle ouverte / fermée | open / closed loop | |
| dépassement | overshoot | |
| temps de montée | rise time | |
| régime permanent | steady state | |

## Digital communications

| French | English | Never |
|---|---|---|
| porteuse | carrier | |
| symbole | symbol | |
| débit | rate (bit rate, symbol rate) | throughput |
| canal | channel | |
| égalisation | equalization | |
| constellation | constellation | |
| diagramme de l'œil | eye diagram | eye pattern |
| taux d'erreur binaire | bit error rate (BER) | binary error rate |
| code correcteur | error-correcting code | |
| entrelacement | interleaving | |

## Machine learning

| French | English | Never |
|---|---|---|
| apprentissage automatique | machine learning | |
| couche | layer | |
| poids | weights | |
| fonction d'activation | activation function | |
| descente de gradient | gradient descent | |
| frontière de décision | decision boundary | |
| composante principale | principal component | |
| valeur propre / vecteur propre | eigenvalue / eigenvector | own value |
| valeur singulière | singular value | |
| rang | rank | |
| saturation (ACP) | loading | saturation |
| éboulis | scree plot | |

## The words of the instrument itself

These name the app's own machinery and are already fixed in
`src/core/strings.js`; a manifest or a scene note must use the same word.

| Concept | English |
|---|---|
| the parameter pills at the bottom | Prompt Bar / pills |
| the right slide-in panel | Parameters drawer |
| a lecture scene | preset / scene |
| the greyed snapshot behind the plot | freeze ghost |
| pinning the axis domains | axis lock |
| the line of readings under the plot | statline |
| a named quantity produced by `compute` | observable |
| the developer panel | Inspector |

## Scene titles

A scene title says what the scene is FOR, in sentence case, and carries **no
number**: not `Scene 3 · The three regimes` but `The three regimes`.

The rank is the engine's to know. The preset picker already draws it — `3/7` on
the collapsed button, `3` beside the title in the list — derived from the
position, so it cannot be wrong. Typed into the title it was duplicated data,
and duplicated data drifts: half the catalogue carried the prefix and half did
not, five subjects carried both at once, and inserting a scene meant renumbering
every title below it by hand. That happened twice in one afternoon before the
prefix was removed from all 166 titles that had it.

Good titles are short and say the finding, not the setup: `Two free decibels`,
`I erases everything`, `The bias that wins`, `Four marksmen, one vocabulary`.
The median is 27 characters; past about 50 the collapsed picker wraps.

## Scene notes

Notes carry what the lecture is for: what to show, in what order, which question
to put to the room and which wrong answer to expect. They are read by the person
teaching, before and during the class.

**Write them in prose, not as a transcript of speech.** Complete sentences,
ordinary punctuation, no telegraphic fragments and no stage directions in the
imperative:

> ✗ `n=1 : flat comb, 6 teeth — nothing Gaussian. Raise n: 2 (triangle),
> 5 (bell), 30 (perfect). Hammer R!`
>
> ✓ `At n = 1 the histogram is a flat comb with six teeth, and nothing about it
> is Gaussian. Raising n gives a triangle at 2, a bell at 5, and by 30 a curve
> the eye cannot tell from the orange one.`

The reason is not decorum. A note is read once at speed the night before, and
again in the middle of a lecture with a room waiting; a fragment has to be
reconstructed both times, a sentence does not. Prose also survives being read by
someone who did not write it — which is the whole point of a catalogue meant to
be adapted by colleagues.

What survives the change of register: the questions to ask, quoted as they will
be asked; the wrong answer worth predicting; the number the room should read off
the statline. What goes: exclamation marks, abbreviations, and the imperative
mood used as shorthand for "do this now".
