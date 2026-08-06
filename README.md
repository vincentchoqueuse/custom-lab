# expe34

**Live site: <https://vincentchoqueuse.github.io/custom-lab/>**

The name is a nod to the **GR 34** — the sentier des douaniers that runs the
whole Breton coast. A long trail made of a great many short, well-marked
stages, walked one at a time and always in the same order: which is what a
catalogue of lecture demonstrations is, and where this one is taught.

A purely static scientific demonstration engine for teaching — a catalog of
interactive experiments (statistics, estimation, detection, digital
communications) that are scriptable, projectable, and drivable from the
keyboard. Not a course companion: the professor's bench.

Every lecture scene is a URL: one link reproduces the exact experiment,
parameters, view and seed. Every experiment ships with a numerical
correctness harness (`npm run check`) that gates deployment. The default
seed is **34**, for the same reason as the name.

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

## Embedding a figure in your own course page

Any scene becomes a live, drivable figure inside a Moodle page, an LMS
activity or any HTML document — add `embed=1` to its URL:

```html
<iframe src="https://vincentchoqueuse.github.io/custom-lab/#/spectral/subspace?df=0.5&embed=1"
        loading="lazy" style="width:100%; height:620px; border:none"></iframe>
```

The frame keeps the tabs, the plot, the draw/freeze actions and the parameter
pills — students adjust the figure inside your page — and drops the rest of
the chrome. A small `expe34` chip opens the same scene in the full catalogue.

Keep `loading="lazy"`: the browser then only instantiates the frames near the
viewport. Measured with ten embeds on one page: the bundle is fetched once
(~320 kB gzip, shared by every frame) and the ten live instruments settle in
about 24 MB of JS heap — lighter than plotly.js loads before drawing its
first figure.

## Writing an experiment

One self-contained directory under `src/experiments/<subject>/<id>/`,
scaffolded by `npm run new:experiment`:

- `manifest.js` — params (field factories), views (view factories), validation
- `scenes.js` — the lecture script (auto-discovered)
- `compute.js` — pure, seeded, stateless science (runs in a worker)
- `check.js` — numerical correctness checks (`npm run check`)

The core discovers experiments automatically; adding one never modifies the
core. Reference example: `src/experiments/estimation/confidence-intervals/`.

## License

AGPL-3.0 — see [LICENSE](LICENSE).
