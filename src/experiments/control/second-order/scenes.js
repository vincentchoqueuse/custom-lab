// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'regimes',
    title: 'Les trois régimes',
    params: { K: 1, m: 0.3, w0: 2 },
    visible: ['m'],
    notes: `m = 0.3 : ça sonne — oscillations sous l'enveloppe exponentielle,
dépassement 37% (statline, et la formule e^(−mπ/√(1−m²)) à côté).
Geler (F), monter m : 0.7 (un seul rebond), 1 (critique — le plus
rapide SANS dépassement), 2 (mou : deux constantes de temps, la lente
traîne). Question rituelle : « pour aller vite sans dépasser, on met
m = ? » — 1, et c'est un compromis, pas une loi.`,
  },
  {
    id: 'poles',
    title: 'Les pôles voyagent sur le cercle',
    params: { K: 1, m: 0.3, w0: 2 },
    view: 'poles',
    visible: ['m', 'w0'],
    notes: `Bouger m de 0.05 à 1 : les deux pôles VOYAGENT SUR le cercle de
rayon ω₀ — l'angle avec l'axe imaginaire vaut sin⁻¹... l'angle avec
l'axe réel est cos⁻¹(m). À m = 1 ils se rejoignent en −ω₀ ; au-delà,
ils se séparent sur l'axe réel (l'un vers 0 : le mode LENT qui domine).
Bouger ω₀ : le cercle gonfle, la géométrie est inchangée — ω₀ est
l'échelle de temps, m est la FORME. Deux nombres, toute la dynamique.`,
  },
  {
    id: 'resonance',
    title: 'La résonance — et l\'identification',
    params: { K: 1, m: 0.2, w0: 2 },
    view: 'freq',
    visible: ['m'],
    notes: `m < 0.707 : |H| bosse à ωr = ω₀√(1−2m²) avec Mr = K/(2m√(1−m²)) —
à m = 0.2, Mr ≈ 2.55, soit +8 dB au-dessus de K. Monter m : la bosse
fond, disparaît exactement à 0.707. Lien avec le cours d'électronique :
mesurer (K, Mr, ωr) sur un Bode réel suffit à REMONTER à (m, ω₀) —
c'est l'identification, le chemin inverse de tout ce qu'on vient de
faire. Même système, trois regards : temporel, pôles, fréquentiel.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
