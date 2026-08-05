// READING A VALUE OFF THE PLOT — the crosshair, and the frozen statline.
//
// Both answer the same question, which is the one a room asks most often and
// which the instrument could not answer at all until now: not "what shape is
// it" but "what is it worth, here". A shape is visible; a number is not.
//
// Two promises, and both are the kind that fail silently:
//
//   · a rule that appears MUST carry a number. A crosshair drawing itself over
//     a plot and reporting nothing is decoration, and decoration over data is
//     worse than nothing — it hides a sample and answers no question.
//   · a reading is TRANSIENT and must not survive into anything permanent. `F`
//     is a keyboard shortcut and fires perfectly happily while the pointer sits
//     on the curve; a ghost carrying a stray rule would falsify every later
//     comparison, and an exported SVG carrying one would falsify a slide.
//
// The legend suite next door exists for the same reason and caught the exact
// bug this feature introduced: the crosshair's capture surface covers the whole
// frame, the legend chips live inside it, and drawn in the wrong order the
// chips stopped being clickable. Nothing in `npm run check` can see that.
import { run } from '../harness.mjs';

const CURVE = 'analog/bode-measurement?view=gain'; // two curves, log abscissa
const STACK = 'comm/constellations?view=time'; // two panels, one abscissa
const FROZEN = 'estimation/confidence-intervals'; // random: R moves the readings

/** The readout is OFF until asked for — a switch in the statline, or C. */
async function enableCrosshair(page) {
  if (await page.$('.statline .export button.on')) return;
  await page.keyboard.press('c');
  await page.waitForTimeout(200);
}

/** Puts the pointer at a fraction of the plot and lets the crosshair settle. */
async function point(page, fx = 0.45, fy = 0.4) {
  const box = await page.locator('svg.plot-svg').first().boundingBox();
  await page.mouse.move(box.x + box.width * fx, box.y + box.height * fy);
  await page.waitForTimeout(250);
  return box;
}

const readout = (page) =>
  page.evaluate(() => {
    const gs = [...document.querySelectorAll('[data-transient="crosshair"]')];
    return gs.map((g) => ({
      rules: g.querySelectorAll('line').length,
      dots: g.querySelectorAll('circle').length,
      values: [...g.querySelectorAll('text')].map((t) => t.textContent.trim()),
      x: g.querySelector('line')?.getAttribute('x1'),
    }));
  });

export default () =>
  run('reading', async (t, page, h) => {
    /* ---------- the crosshair reads ------------------------------------- */
    await h.go('#/' + CURVE);
    // OFF by default, and off means no capture surface at all: pointing at the
    // plot must draw nothing until the switch has been thrown
    await point(page);
    t('nothing until the switch is thrown', (await readout(page)).length === 0);
    t('and the switch is offered here', !!(await page.$('.statline .export button[title*="pointer" i]')));

    await enableCrosshair(page);
    t('no crosshair before the pointer arrives', (await readout(page)).length === 0);

    await point(page);
    const r = await readout(page);
    t('pointing draws one crosshair', r.length === 1, `${r.length} groups`);
    t('it puts a dot on every curve', r[0]?.dots >= 2, `${r[0]?.dots} dots`);
    // dots + the abscissa: a rule with no number is decoration
    t(
      'and a number for each, plus the abscissa',
      r[0]?.values.length === r[0]?.dots + 1,
      r[0]?.values.join(' ')
    );
    t(
      'the numbers are numbers',
      r[0]?.values.every((v) => Number.isFinite(Number(v.replace('−', '-')))),
      r[0]?.values.join(' ')
    );

    await page.mouse.move(5, 5);
    await page.waitForTimeout(250);
    t('leaving the frame clears it', (await readout(page)).length === 0);

    /* ---------- a stack reads ONE instant ------------------------------- */
    // Two panels each tracking their own pointer would agree to within a pixel
    // and disagree in the reading — on the one figure built to be read down.
    await h.go('#/' + STACK);
    await enableCrosshair(page);
    await point(page, 0.45, 0.25);
    const s = await readout(page);
    t('a stack draws a rule in every panel', s.length === 2, `${s.length} groups`);
    t('at exactly one abscissa', new Set(s.map((g) => g.x)).size === 1, s.map((g) => g.x).join(' vs '));
    // the abscissa is the shared axis's: it is printed once, under the panel
    // that graduates it
    const boxes = s.filter((g) => g.values.length > g.dots);
    t('and prints the abscissa once', boxes.length === 1, `${boxes.length} abscissa readouts`);

    /* ---------- the reading never becomes permanent --------------------- */
    await h.go('#/' + CURVE);
    await enableCrosshair(page);
    await point(page);
    await page.keyboard.press('f'); // freeze WITH the pointer on the curve
    await page.waitForTimeout(400);
    const ghost = await page.evaluate(() => {
      const g = document.querySelector('.plot-ghost');
      return { exists: !!g, transient: g ? g.querySelectorAll('[data-transient]').length : -1 };
    });
    t('freezing under the pointer still makes a ghost', ghost.exists);
    t('and the ghost carries no crosshair', ghost.transient === 0, `${ghost.transient} left in it`);

    const svg = await page.evaluate(async () => {
      // the export path, exercised as the button does it
      const btns = [...document.querySelectorAll('.statline .export button')];
      return btns.map((b) => b.textContent.trim()).join(',');
    });
    t('the export buttons are still there', /SVG/.test(svg), svg);

    // a plane carries no readout, so it must not offer a switch either
    await h.go('#/comm/mimo?view=antennas');
    t(
      'a plane offers no switch, because it has no readout',
      !(await page.$('.statline .export button[title*="pointer" i]'))
    );

    /* ---------- the statline freezes with the picture ------------------- */
    await h.go('#/' + FROZEN);
    const plain = await h.statline();
    t('no before-value until frozen', !/→/.test(plain), plain.slice(0, 60));

    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    t('freezing alone changes no reading', !/→/.test(await h.statline()));

    await page.keyboard.press('r'); // draw again: the readings move
    await page.waitForTimeout(800);
    const delta = await page.evaluate(() => ({
      arrows: document.querySelectorAll('.statline .arrow').length,
      was: [...document.querySelectorAll('.statline .was')].map((e) => e.textContent),
    }));
    t('a changed reading shows what it was', delta.arrows > 0, `${delta.arrows} arrows`);

    // the reference is the FREEZE, not the previous draw: that is the whole
    // point of pinning one
    await page.keyboard.press('r');
    await page.waitForTimeout(800);
    const again = await page.evaluate(() =>
      [...document.querySelectorAll('.statline .was')].map((e) => e.textContent)
    );
    t('and it stays the frozen one across draws', again.join() === delta.was.join(), again.join(' '));

    await page.keyboard.press('f');
    await page.waitForTimeout(300);
    t('unfreezing takes the before-values away', !/→/.test(await h.statline()));
  });
