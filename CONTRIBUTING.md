# Contributing to pupitra

Contributions are welcome — an experiment is a self-contained directory of
four files, and the core never changes to accommodate one. Before opening a
pull request:

1. Read the contract in [CLAUDE.md](CLAUDE.md) and the reference example,
   `src/experiments/estimation/confidence-intervals/`.
2. Scaffold with `npm run new:experiment` — the result appears in the sidebar
   and runs before you write any domain code.
3. `npm run check` must be green. **No experiment is accepted without
   `numeric` or `statistical` checks**: UI code can be wrong without
   consequence; a wrong formula projected in a lecture hall cannot.
4. Everything in English — code, labels, docs, commit messages. Recurring
   terms come from [TERMINOLOGY.md](TERMINOLOGY.md), a closed list.
5. Commit prefix: `exp(<id>):` with a body that says what the views show and
   what the checks prove, measured numbers included.

Experiments you author stay attributed to you: the manifest's `author` and
`date` fields exist for exactly that, and they are shown in the experiment's
info panel.

## Licensing of contributions

pupitra is licensed under the [AGPL-3.0](LICENSE). So that the project can be
maintained and licensed coherently over time — including under other licence
terms when a single AGPL offering is not workable for an institution — its
maintainer must remain the sole licensor of the codebase. By submitting a
contribution (pull request, patch, or any other form), you agree to the
following:

1. **Certification.** The contribution is your own original work (or you have
   the right to submit it), and you have the authority to grant the rights
   below.
2. **Public licence.** Your contribution is licensed to everyone under the
   AGPL-3.0, like the rest of the project.
3. **Maintainer grant.** You additionally grant the project maintainer
   (Vincent Choqueuse) a perpetual, worldwide, non-exclusive, royalty-free,
   irrevocable licence to use, reproduce, modify, sublicense and distribute
   your contribution, including under licence terms other than the AGPL-3.0.

You keep the copyright on your contribution. The grant is non-exclusive: it
takes nothing away from you — you remain free to use your own work however
you wish. If you cannot or do not wish to agree to these terms, please open
an issue instead of a pull request, so the feature can be discussed and
implemented independently.
