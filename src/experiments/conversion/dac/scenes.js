// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'staircase',
    title: "Scène 1 · L'escalier fond",
    params: { f0: 1000, L: 1, digFilter: true },
    visible: ['L'],
    notes: `L = 1 : l'escalier brut du CNA, les marches sautent aux yeux (et
s'entendraient). Passer L à ×4 puis ×8 : les marches fondent VERS le signal
idéal orange — sans changer les échantillons violets. Question : « on n'a
ajouté aucune information ; d'où vient la douceur ? » — réponse dans l'onglet
domaine numérique.`,
  },
  {
    id: 'stuffing',
    title: 'Scène 2 · Des zéros, puis un filtre',
    view: 'digital',
    params: { f0: 1000, L: 4, digFilter: true },
    visible: ['digFilter'],
    notes: `Le secret du suréchantillonnage : on insère L−1 ZÉROS entre les
échantillons (barres bleues), puis le filtre d'interpolation les remplit
(courbe orange) — en passant EXACTEMENT par les échantillons d'origine
(propriété du noyau sinc, vérifiée à 1e-15 par le harnais). Couper le filtre :
les zéros restent — et regarder alors la vue temporelle : le CNA crache une
chenille de pics.`,
  },
  {
    id: 'images',
    title: "Scène 3 · Les images s'enfuient",
    view: 'spectrum',
    params: { f0: 1000, L: 1, digFilter: true },
    visible: ['L'],
    notes: `L = 1 : la première image est à Fs − f₀ = 7 kHz, à peine atténuée —
il faudrait un filtre analogique falaise entre 3.5 et 7 kHz. Geler (F), passer
L = 8 : l'image s'enfuit à 63 kHz, DÉJÀ enfoncée par le sinc. Un RC du
commerce suffit. C'est TOUT l'argument du suréchantillonnage : du calcul
numérique bon marché contre de l'analogique de précision hors de prix.`,
  },
  {
    id: 'droop',
    title: 'Scène 4 · Le droop du sinc',
    view: 'spectrum',
    params: { f0: 3400, L: 1, digFilter: true },
    visible: ['f0', 'L'],
    notes: `f₀ = 3.4 kHz en bord de bande, L = 1 : la statline montre le droop —
le ZOH mange ~2.7 dB (sinc(0.425)). Les aigus d'un lecteur CD sans
suréchantillonnage seraient éteints. Passer L = 8 : le droop devient 0.04 dB.
Deuxième cadeau du suréchantillonnage, plus discret que les images, tout aussi
décisif.`,
  },
];
