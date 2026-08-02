// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'lecture',
    title: 'Lire un œil sain',
    params: { levels: 2, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 200 },
    visible: ['alpha'],
    notes: `200 tranches de 2T superposées : l'œil. Entre les instants, le signal
oscille librement — mais à t = T (ligne jaune), TOUTES les traces
passent par ±1 : c'est le critère de Nyquist du cosinus surélevé, l'ISI
s'annule exactement là où l'on décide. Baisser α vers 0.05 : l'œil
reste ouvert À l'instant exact, mais se referme horizontalement — une
horloge imprécise ne pardonne plus. α est le prix payé en bande pour de
la tolérance temporelle.`,
  },
  {
    id: 'isi',
    title: 'Le canal ferme l\'œil',
    params: { levels: 2, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 200 },
    visible: ['bt', 'sigma'],
    notes: `Geler (F) l'œil sain, puis réduire B·T : le canal trop étroit étale
chaque impulsion sur ses voisines — l'ISI referme l'œil verticalement
et DÉCALE l'instant optimal (retard de groupe). Vers B·T ≈ 0.4, l'œil
est fermé : plus aucun seuil ne sépare les niveaux, quel que soit
l'instant. La statline chiffre l'agonie : l'ouverture passe de ~1.9 à
négative. Monter ensuite σ : le bruit fait la même chose, sans le
décalage.`,
  },
  {
    id: '4pam',
    title: '4-PAM : trois yeux empilés',
    params: { levels: 4, alpha: 0.35, bt: 8, sigma: 0.02, Nsym: 400 },
    visible: ['levels', 'sigma'],
    notes: `Deux bits par symbole = quatre niveaux = TROIS yeux, chacun trois fois
plus petit que l'œil du 2-PAM. Vue « À l'instant d'échantillonnage » :
quatre paquets bien séparés… tant que σ reste sage. Monter σ à 0.1 :
les paquets se touchent — le 4-PAM casse le premier, exactement comme
la 16-QAM cassait avant la QPSK dans les constellations. Même monnaie :
le débit se paie en marge de bruit.`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
