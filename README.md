# Pupitre

**Live site: <https://vincentchoqueuse.github.io/custom-lab/>**

A purely static scientific demonstration engine for teaching — a catalog of
interactive experiments (statistics, estimation, detection, digital
communications) that are scriptable, projectable, and drivable from the
keyboard. Not a course companion: the professor's bench.

Every lecture scene is a URL: one link reproduces the exact experiment,
parameters, view and seed. Every experiment ships with a numerical
correctness harness (`npm run check`) that gates deployment.

See `CLAUDE.md` for the full vision, contracts and architecture.

## Quick start

```sh
npm install
npm run dev              # local dev server
npm run check            # numerical correctness harness (every experiments/**/check.js)
npm run build            # static build in dist/, deployable as-is
npm run new:experiment   # scaffold a new experiment (4 files, runs immediately)
```

Pushes to `main` run the checks, build, and deploy to
[GitHub Pages](https://vincentchoqueuse.github.io/custom-lab/) via
`.github/workflows/deploy.yml`.

## Keyboard (lecture-ready)

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command Palette (experiment search) |
| `⌘B` / `Ctrl+B` | Toggle sidebar |
| `P` | Parameter drawer |
| `R` | Draw again (randomizeSeed) |
| `F` | Freeze frame — pin the current plot as a gray ghost, compare |
| `L` | Presentation mode (fullscreen, enlarged strokes/type) |
| `←` / `→` | Previous / next lecture scene |
| `Esc` | Clear ghost, close popover / palette, exit fullscreen |

## Writing an experiment

One self-contained directory under `src/experiments/<subject>/<id>/`,
scaffolded by `npm run new:experiment`:

- `manifest.js` — params (field factories), views (view factories), validation
- `scenes.js` — the lecture script (auto-discovered)
- `compute.js` — pure, seeded, stateless science (runs in a worker)
- `check.js` — numerical correctness checks (`npm run check`)

The core discovers experiments automatically; adding one never modifies the
core. Reference example: `src/experiments/stats/confidence-intervals/`.

## License

AGPL-3.0 — see [LICENSE](LICENSE).
