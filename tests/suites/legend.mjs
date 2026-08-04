// The legend is clickable: a chip switches its curve off and on again.
//
// What this suite mostly guards is the promise: a chip that looks like a button
// MUST hide something. On the first attempt the cartesian plot obeyed and the
// planes did not — the chips there were clickable and did nothing, which is
// worse than having no button at all. Both rendering paths are therefore
// verified separately.
import { run } from '../harness.mjs';

// a cartesian view with three curves, and a plane with markers and a circle
const CURVES = 'analog/demodulation?view=freq';
const PLANE = 'control/second-order?view=poles';

export default () =>
  run('legend', async (t, page, h) => {
    /* ---------- cartesian plot ----------------------------------------- */
    await h.go('#/' + CURVES);
    const paths = () => page.$$eval('.plot-area svg path', (n) => n.length);
    const chips = await page.$$eval('.legend-chip', (n) => n.length);
    t('the chips are buttons', chips >= 3, `${chips} chips`);

    const all = await paths();
    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(400);
    t('clicking hides the curve', (await paths()) < all, `${all} → ${await paths()}`);

    const pressed = await page.$$eval('.legend-chip', (n) =>
      n.map((x) => x.getAttribute('aria-pressed'))
    );
    t('aria-pressed follows the state', pressed[1] === 'false' && pressed[0] === 'true', pressed.join(','));

    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(400);
    t('clicking again brings it back', (await paths()) === all);

    await page.focus('.legend-chip >> nth=2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    t('the Enter key does the same', (await paths()) < all);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    t('Escape brings everything back', (await paths()) === all);

    // the state is DISPLAY: it must not enter the URL, or a lecture link
    // would carry a switched-off curve without saying so
    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(300);
    const hash = await page.evaluate(() => location.hash);
    t('the state does not enter the URL', !/hidden/.test(hash), hash);

    await h.go('#/analog/demodulation?view=time');
    await h.go('#/' + CURVES);
    t('changing view brings everything back', (await paths()) === all);

    /* ---------- plane (markers, clouds, circle) ------------------------- */
    await h.go('#/' + PLANE);
    const dots = () => page.$$eval('.plot-area svg circle', (n) => n.length);
    const d0 = await dots();
    await page.click('.legend-chip >> nth=0');
    await page.waitForTimeout(400);
    t('on a plane too, the click hides', (await dots()) < d0, `${d0} → ${await dots()}`);
    await page.click('.legend-chip >> nth=0');
    await page.waitForTimeout(400);
    t('and brings back', (await dots()) === d0);
    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(400);
    t('the guide circle switches off too', (await dots()) < d0, `${await dots()} points`);
  });
