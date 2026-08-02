// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'scope',
    title: "Scène 1 · Ce qu'on voit à l'oscillo",
    params: { system: 'rc', fc: 500, f: 100, sigma: 0.05 },
    visible: ['f'],
    notes: `f = 100 Hz, bien sous f_c = 500 Hz : la sortie orange suit l'entrée.
Monter f au potard (c'est LE geste du TP) : la sortie fond ET glisse vers la
droite. Deux nombres à lire sur l'écran : le rapport des amplitudes et le
décalage temporel — Δφ = 360°·f·Δt. Toute la réponse fréquentielle est là.`,
  },
  {
    id: 'coupure',
    title: 'Scène 2 · Le point −3 dB',
    params: { system: 'rc', fc: 500, f: 500, sigma: 0.05 },
    visible: ['f', 'fc'],
    notes: `f = f_c exactement : statline → gain −3.01 dB (sortie à 70.7 %),
phase −45°. C'est la DÉFINITION opérationnelle de la fréquence de coupure :
au labo on cherche le point où la sortie vaut 0.707 de l'entrée, pas une
asymptote. Geler (F), bouger f_c : le point suit.`,
  },
  {
    id: 'campagne',
    title: 'Scène 3 · La campagne de mesure',
    view: 'gain',
    params: { system: 'rc', fc: 500, f: 500, sigma: 0.05 },
    visible: ['sigma'],
    notes: `25 mesures au banc (points oranges) sur la théorie (bleue). Marteler
R : chaque campagne redonne des points légèrement différents — c'est une
MESURE, pas un calcul. Monter σ : où la mesure décroche-t-elle en premier ?
Loin dans la bande coupée, là où la sortie s'enfonce sous le bruit. Le plancher
de l'oscillo limite la dynamique mesurable.`,
  },
  {
    id: 'resonance',
    title: 'Scène 4 · La résonance',
    view: 'gain',
    params: { system: 'order2', f0: 500, Q: 2, f: 500, sigma: 0.05 },
    visible: ['Q'],
    notes: `Le 2ᵉ ordre : un pic pousse à f₀ quand Q monte — hauteur ≈ 20·log₁₀Q.
Geler (F) à Q = 2, pousser Q à 15 : le pic s'affine. Basculer sur l'onglet
phase : la bascule 0 → −180° se raidit autour de f₀ — c'est la signature qui
fera comprendre la marge de phase en automatique (expérience PID).`,
  },
];
