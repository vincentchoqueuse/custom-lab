// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'match',
    title: 'Scène 1 · Le prototype passe au numérique',
    params: { method: 'bilinear', family: 'butter', n: 4, fc: 1000, Amax: 1 },
    visible: ['family', 'n'],
    notes: `La courbe numérique (bleue) épouse le prototype analogique
(orange) dans toute la bande utile — statline : coupure obtenue = 1000 Hz,
pile. Puis elle PLONGE à Nyquist là où l'analogique se contente de rouler :
la bilinéaire met n zéros en z = −1. Ce n'est pas un défaut, c'est la
signature de la méthode — tout l'axe jω est enroulé sur le cercle unité.`,
  },
  {
    id: 'warping',
    title: 'Scène 2 · Oublier le pré-gauchissement',
    params: { method: 'naive', family: 'butter', n: 4, fc: 1000, Amax: 1 },
    visible: ['method', 'fc'],
    notes: `Bilinéaire naïve, f_c = 1000 Hz : coupure obtenue 948 Hz. Monter
f_c à 3000 : obtenue 2204 Hz — 800 Hz d'erreur ! L'onglet Gauchissement
montre pourquoi : la tangente s'écarte de l'identité en montant vers Nyquist.
Geler (F), repasser en pré-gauchie : la coupure retombe exactement sur la
cible. Le pré-gauchissement ne corrige qu'UN point — mais c'est le bon.`,
  },
  {
    id: 'zplane',
    title: "Scène 3 · Le demi-plan gauche s'enroule",
    view: 'zplane',
    params: { method: 'bilinear', family: 'butter', n: 6, fc: 1000, Amax: 1 },
    visible: ['n', 'fc'],
    notes: `Les pôles analogiques du demi-plan gauche atterrissent DANS le
cercle unité (stabilité préservée, c'est le théorème), les n zéros s'empilent
en z = −1. Monter f_c : les pôles migrent vers z = −1 — la bande utile
s'étale sur le cercle. Basculer en invariance impulsionnelle : mêmes pôles
analogiques, autre carte (z = e^{pT}), plus de zéros à −1.`,
  },
  {
    id: 'aliasing',
    title: "Scène 4 · L'invariance impulsionnelle et son repliement",
    params: { method: 'impulse', family: 'butter', n: 2, fc: 1000, Amax: 1 },
    visible: ['method', 'n'],
    notes: `h[n] = T·h_a(nT) EXACTEMENT — c'est sa définition, et le harnais
le vérifie à 3e-16. Mais regarder près de Nyquist : la numérique remonte
au-dessus de l'analogique — la queue du spectre analogique au-delà de Fs/2
se REPLIE dedans. Monter n : la queue raccourcit, le repliement fond.
Question de synthèse : « quelle méthode choisir pour un passe-bas audio ?
et pour préserver une réponse temporelle ? » — les deux réponses diffèrent.`,
  },
];
