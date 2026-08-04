// Le CADRAGE en fréquence de l'expérience, partagé par le calcul (la grille
// du périodogramme et du pseudo-spectre) et par le manifeste (le domaine de
// l'axe). Un seul endroit, parce que deux valeurs égales par convention
// finissent toujours par ne plus l'être.
//
// Il est FIGÉ, et c'est le propos : on change ici N, Δf, M et d pour voir la
// RÉSOLUTION bouger. Un cadrage suivant la limite de Fourier se resserrait
// exactement quand N montait — les deux raies gardaient donc le même écart à
// l'écran et l'effet qu'on venait montrer disparaissait. Le cadre tient, la
// courbe bouge. (C'est le verrou d'axes de `A`, mais permanent et par
// construction : ici il n'y a pas de cadrage honnête à découvrir.)

export const F_LO = 170; // Hz
export const F_HI = 230; // Hz — les deux raies proches, autour de F1 = 200
// La troisième raie est à 330 Hz : avec elle la fenêtre s'élargit, sinon
// « les trois pics sont là » serait faux d'un tiers.
export const F_HI_FAR = 350; // Hz

/** Le domaine de l'axe des fréquences, selon la configuration. */
export const fWindow = (p) => (Number(p.sources) === 3 ? [F_LO, F_HI_FAR] : [F_LO, F_HI]);

/** La base du cadre de la vue « Spectre estimé », en dB. Les rectangles de
 *  bruit y descendent exactement, donc le calcul et l'axe la partagent. */
export const MODEL_FLOOR = -60;
