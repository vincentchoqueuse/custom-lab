// Lecture script. Auto-discovered by the registry.
export default [
  {
    id: 'syndrome',
    title: 'Une erreur par trame : gratuite',
    params: { code: 'hamming74', ebn0Db: 5, Nbits: 20000 },
    visible: ['ebn0Db'],
    notes: `Chaque colonne est une trame de 7 bits (4 données + 3 parités, ligne
grise). Un point bleu = un bit retourné par le canal. Regarder les
colonnes à UN SEUL point bleu : aucune erreur orange — le syndrome
pointe le coupable, le décodeur le corrige. Les oranges n'apparaissent
que dans les colonnes à 2+ bleus, et parfois sur un bit que le canal
n'avait PAS touché : le décodeur, sûr de lui, corrige de travers.
Marteler R, faire compter les colonnes à 2 bleus.`,
  },
  {
    id: 'crossover',
    title: 'Le croisement : coder peut perdre',
    params: { code: 'hamming74', ebn0Db: 2, Nbits: 40000 },
    view: 'ber',
    visible: ['ebn0Db'],
    notes: `À Eb/N₀ égal, les 7 bits émis se partagent l'énergie de 4 bits utiles :
le canal codé est PIRE (taxe −10·log₁₀(4/7) = 2.4 dB). En dessous de
~3 dB, la violette est AU-DESSUS de la bleue : le code perd — trop
d'erreurs, il corrige de travers. Au-delà, il gagne, et l'écart croît :
lire le gain à BER = 10⁻⁵ (~0.6 dB en dur). La pente aussi change :
p² au lieu de p — le code double la pente de la cascade.`,
  },
  {
    id: 'repetition',
    title: 'La répétition, fausse bonne idée',
    params: { code: 'repetition3', ebn0Db: 5, Nbits: 40000 },
    view: 'ber',
    visible: ['code'],
    notes: `L'idée naïve de la salle : « répéter trois fois et voter ». Verdict
sur la courbe : la répétition ×3 ne passe JAMAIS sous le sans-codage —
la taxe de rendement (4.8 dB !) mange tout le bénéfice du vote, à tout
Eb/N₀. Rebasculer sur Hamming : même prix par trame (3 parités), mais
4 bits protégés au lieu d'un. Moralité : un code n'est pas « de la
redondance », c'est de la redondance STRUCTURÉE — et le choix de la
structure fait tout. Suite logique : plus long, plus malin (BCH, LDPC).`,
  },
];
// notes: Teacher Mode only. Never projected by default, never in the URL.
