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

pupitra is licensed under the [AGPL-3.0](LICENSE), and contributions are the
simplest possible deal — inbound equals outbound: by submitting a pull
request you certify the work is your own (or that you have the right to
submit it), and you license it under the AGPL-3.0 like the rest of the
project. You keep your copyright. Nothing else is asked.
