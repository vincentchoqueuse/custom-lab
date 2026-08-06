// Lecture script — auto-discovered by the registry.
export default [
  {
    id: 'gabor',
    title: 'The Gabor trade-off',
    view: 'map',
    params: { source: 'chirp', f1: 900, N: 256, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'N'],
    notes: `A chirp is a diagonal. Freezing at N = 64 gives a sharp time axis and
a blurred frequency axis; N = 1024 gives the opposite.

The statline holds the invariant: Δf·Δt = 1, always. One does not choose to be
good everywhere, only WHERE to be good. This is the uncertainty principle in
its signal-processing form.`,
  },
  {
    id: 'tones',
    title: 'Two notes: how long to tell them apart?',
    view: 'map',
    params: { source: 'tones', df: 15, N: 64, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'N', 'df'],
    notes: `Two tones 15 Hz apart with a short window give a single band. The
question to the room is how long one has to listen to hear two notes, and the
answer is about 1/Δf.

Raising N until they separate — at N = 256, where Δf becomes 7.8 Hz — turns the
answer into a measurement. The ear performs exactly this calculation.`,
  },
  {
    id: 'aliasing',
    title: 'The bounce off Nyquist',
    view: 'map',
    params: { source: 'chirp', f1: 2800, N: 256, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'f1'],
    notes: `The prediction belongs before f₁ is raised: the chirp climbs, so what
does the ridge do when it reaches 1000 Hz?

It BOUNCES. The zigzag is aliasing, and it is the visual signature of the
sampling theorem — the same phenomenon as in the sampling experiment, seen this
time in the time–frequency plane.`,
  },
  {
    id: 'am',
    title: 'Two descriptions of the same signal',
    view: 'map',
    params: { source: 'am', fm: 8, N: 128, win: 'hann', tcut: 1 },
    visible: ['source', 'win', 'fm'],
    notes: `An AM signal at f_m = 8 Hz. With a short window — N = 128, so
Δt = 64 ms — the beat is visible as pulsing columns.

Freezing and moving to N = 1024, giving Δt = 512 ms and Δf = 2 Hz, makes the
beat disappear and replaces it with THREE lines: the carrier and its sidebands
at ±f_m. Neither picture is wrong. It is the same physics projected onto two
resolutions.`,
  },
  {
    id: 'fm',
    title: 'Two ridges crossing',
    view: 'map',
    params: { source: 'fm', f1: 900, fmod: 1, fdev: 150, N: 256, win: 'hann', tcut: 0.5 },
    visible: ['source', 'win', 'fmod', 'fdev'],
    notes: `A chirp AND a sinusoid whose frequency oscillates slowly: a rising
line and a wave around 500 Hz, and they cross. No spectrum can show that, and
this picture is precisely why the spectrogram exists.

Raising f_mod tightens the oscillation until it BLURS — the frequency is
changing too fast for the window. Dropping N to 64 sharpens the FM ridge again
and thickens the chirp line. That is Gabor with two signals asking for opposite
settings in the same image. Widening Δ grows the deviation until it touches the
chirp.`,
  },
];
