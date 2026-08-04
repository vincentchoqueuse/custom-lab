// The catalogue's vocabulary of STANDARD FIGURES — the names, declared once.
//
// The code behind the figures was already shared (core/response-views.js,
// _lib/bode.js). What kept drifting was the NAME: the same pole map was
// "Poles and zeros" in one experiment and "Pole map" in the next, and
// `?view=gain` meant a Bode gain here and a Kalman gain there. A name is a
// thing that repeats, so it is declared once, here, and nowhere else.
//
// Two halves, because they answer to different owners:
//
//   THE id IS GLOBAL. `?view=gain` is the magnitude figure in every subject of
//   the catalogue, so a link, a scene and a habit all carry over.
//
//   THE TITLE AND THE ORDER BELONG TO THE SUBJECT. The magnitude figure is
//   honestly called "Bode — gain" in control and "Frequency response" in
//   filtering — same plot, two legitimate names, because two courses speak
//   two ways. And the pole map comes BEFORE the frequency response in
//   control and AFTER it in filtering, because that is the order each
//   course meets them. Both live in the subject's own `_subject.js`, next to
//   its own name: `figures` for the variants, `figureOrder` for the grammar.
//
// The variants are a CLOSED list. A manifest never writes a figure's title:
// it names the figure, and the registry stamps the title. That is what makes
// drift impossible rather than merely discouraged — you cannot mistype a name
// you do not type.
//
// An experiment whose figure is genuinely its own ("The scope", "The channel
// seen by the carriers", "Eye diagram") declares an ordinary view with its
// own id and its own title, and none of this applies. The rule is only: a
// standard figure carries the standard id AND the standard title — never one
// without the other.

export class FigureError extends Error {
  constructor(message) {
    super(message);
    this.name = 'FigureError';
  }
}

/**
 * key → { id, rank, titles }
 *   id     the URL segment, global to the catalogue
 *   rank   the order among the standard figures of an experiment; unranked
 *          views (an experiment's own figures) may sit anywhere
 *   titles the closed list of names this figure answers to, `default` first
 */
export const FIGURES = Object.freeze({
  /* --- what happens in time ---------------------------------------------- */
  time: { id: 'time', titles: { default: 'Time signal' } },
  response: { id: 'response', titles: { default: 'Time response' } },
  step: { id: 'step', titles: { default: 'Step response' } },
  impulse: { id: 'impulse', titles: { default: 'Impulse response' } },

  /* --- what an estimation or a regression experiment leads with ----------- */
  fit: { id: 'fit', titles: { default: 'Fit' } },
  sampling: { id: 'sampling', titles: { default: 'Sampling distribution' } },

  /* --- the plane ---------------------------------------------------------- */
  poles: { id: 'poles', titles: { default: 'Poles and zeros' } },

  /* --- what happens in frequency ------------------------------------------ */
  gain: { id: 'gain', titles: { default: 'Frequency response', bode: 'Bode — gain' } },
  phase: { id: 'phase', titles: { default: 'Phase', bode: 'Bode — phase' } },
  spectrum: { id: 'spectrum', titles: { default: 'Spectrum' } },
});

/**
 * The default grammar: the order the standard figures appear in, when a
 * subject does not state its own. Time, then the plane, then frequency —
 * what happened before why it happened.
 */
export const DEFAULT_ORDER = Object.freeze([
  'time',
  'response',
  'step',
  'impulse',
  'fit',
  'sampling',
  'poles',
  'gain',
  'phase',
  'spectrum',
]);

/** id → figure key, for the guard that catches a squatted canonical id. */
export const FIGURE_BY_ID = Object.freeze(
  Object.fromEntries(Object.entries(FIGURES).map(([key, f]) => [f.id, key]))
);

/**
 * Resolve a figure to its {id, title, rank} for a given subject.
 * @param {string} key            a key of FIGURES
 * @param {object} subjectFigures the subject's `figures` map from _subject.js,
 *                                {figureKey: variantName}
 */
export function resolveFigure(key, subject = {}, where = '', own) {
  const f = FIGURES[key];
  if (!f) throw new FigureError(`${where}: '${key}' is not a standard figure`);
  // the view's own variant wins over the subject's default: one experiment of
  // the analog subject IS a Bode plot and says so, without any of them being
  // able to invent a name — the list is closed either way.
  const variant = own ?? subject.figures?.[key] ?? 'default';
  const title = f.titles[variant];
  if (!title)
    throw new FigureError(
      `${where}: figure '${key}' has no variant '${variant}' ` +
        `(known: ${Object.keys(f.titles).join(', ')})`
    );
  const order = subject.figureOrder ?? DEFAULT_ORDER;
  const rank = order.indexOf(key);
  if (rank < 0)
    throw new FigureError(
      `${where}: figure '${key}' is not in this subject's figureOrder ` +
        `(${order.join(' → ')})`
    );
  return { id: f.id, title, rank };
}

/**
 * Resolve the standard figures and enforce the vocabulary.
 *
 * Two guards, and the second is the one that matters: an experiment may not
 * take a canonical id and put its own title on it. Either a view IS the
 * standard figure — declared with the `figure` factory, so its title comes
 * from the subject and cannot be mistyped — or it is the experiment's own
 * figure and must carry its own id. A pole map called "Pole map" while
 * every other one says "Poles and zeros" now fails at the first `npm run dev`
 * instead of quietly teaching two names for one thing.
 */
export function normalizeViews(views, subject, key) {
  const out = views.map((v) => {
    if (!v.figure) {
      const squatted = FIGURE_BY_ID[v.id];
      if (squatted)
        throw new FigureError(
          `experiment '${key}': view '${v.id}' uses the id of the standard figure ` +
            `'${squatted}' but declares its own title '${v.title}'. Either build it ` +
            `with the figure factory, or give it an id of its own.`
        );
      return v;
    }
    const { id, title, rank } = resolveFigure(
      v.figure,
      subject,
      `experiment '${key}', view '${v.figure}'`,
      v.variant
    );
    return { ...v, id, title, rank };
  });

  // the ranked figures, among themselves, must appear in rank order: the tab
  // grammar a listener reads the catalogue with. Unranked views (the
  // experiment's own figures) may sit anywhere.
  const ranked = out.filter((v) => v.rank != null);
  for (let i = 1; i < ranked.length; i++) {
    if (ranked[i].rank < ranked[i - 1].rank)
      throw new FigureError(
        `experiment '${key}': standard figures out of order — ` +
          `'${ranked[i - 1].title}' before '${ranked[i].title}'. ` +
          `Expected order: ${(subject.figureOrder ?? DEFAULT_ORDER).join(' → ')}.`
      );
  }
  const seen = new Set();
  for (const v of out) {
    if (seen.has(v.id)) throw new FigureError(`experiment '${key}': duplicate view id '${v.id}'`);
    seen.add(v.id);
  }
  return out;
}
