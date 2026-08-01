# ENIB Lab

A purely static scientific demonstration engine for teaching — a catalog of
interactive experiments (statistics, estimation, detection, digital
communications) that are scriptable, projectable, and drivable from the
keyboard. Not a course companion: the professor's bench.

See `CLAUDE.md` for the full vision, contracts and architecture.

## Quick start

```sh
npm install
npm run dev     # opens on the first experiment
npm run check   # numerical correctness harness (every experiments/**/check.js)
npm run build   # static build in dist/, deployable as-is (Netlify ready)
```

## Keyboard (lecture-ready)

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Command Palette (experiment search) |
| `⌘B` / `Ctrl+B` | Toggle sidebar |
| `P` | Parameter drawer |
| `R` | Draw again (randomizeSeed) |
| `L` | Presentation mode (fullscreen, enlarged strokes/type) |
| `←` / `→` | Previous / next lecture scene |
| `Esc` | Close popover / palette, exit fullscreen |

## Writing an experiment

One self-contained directory under `src/experiments/<subject>/<id>/`:

- `manifest.js` — params (field factories), views (view factories), validation
- `scenes.js` — the lecture script (auto-discovered)
- `compute.js` — pure, seeded, stateless science (runs in a worker)
- `check.js` — numerical correctness checks (`npm run check`)

The core discovers experiments automatically; adding one never modifies the
core. Reference example: `src/experiments/stats/confidence-intervals/`.

## License

AGPL-3.0
