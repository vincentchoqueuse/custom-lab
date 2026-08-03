// La légende est cliquable : une pastille éteint ou rallume sa courbe.
//
// Ce que cette suite garde surtout, c'est la promesse : une pastille qui a
// l'air d'un bouton DOIT masquer quelque chose. Au premier essai le tracé
// cartésien obéissait et les plans non — les pastilles y étaient cliquables
// et ne faisaient rien, ce qui est pire que pas de bouton du tout. Les deux
// chemins de rendu sont donc vérifiés séparément.
import { run } from '../harness.mjs';

// une vue cartésienne à trois courbes, et un plan à marqueurs + cercle
const CURVES = 'analog/demodulation?view=freq';
const PLANE = 'control/second-order?view=poles';

export default () =>
  run('legend', async (t, page, h) => {
    /* ---------- tracé cartésien ---------------------------------------- */
    await h.go('#/' + CURVES);
    const paths = () => page.$$eval('.plot-area svg path', (n) => n.length);
    const chips = await page.$$eval('.legend-chip', (n) => n.length);
    t('les pastilles sont des boutons', chips >= 3, `${chips} pastilles`);

    const all = await paths();
    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(400);
    t('cliquer masque la courbe', (await paths()) < all, `${all} → ${await paths()}`);

    const pressed = await page.$$eval('.legend-chip', (n) =>
      n.map((x) => x.getAttribute('aria-pressed'))
    );
    t('aria-pressed suit l’état', pressed[1] === 'false' && pressed[0] === 'true', pressed.join(','));

    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(400);
    t('recliquer rallume', (await paths()) === all);

    await page.focus('.legend-chip >> nth=2');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    t('la touche Entrée fait la même chose', (await paths()) < all);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    t('Échap rallume tout', (await paths()) === all);

    // l'état est de l'AFFICHAGE : il ne doit pas entrer dans l'URL, sinon un
    // lien de cours transporterait une courbe éteinte sans le dire
    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(300);
    const hash = await page.evaluate(() => location.hash);
    t('l’état n’entre pas dans l’URL', !/hidden/.test(hash), hash);

    await h.go('#/analog/demodulation?view=time');
    await h.go('#/' + CURVES);
    t('changer de vue rallume tout', (await paths()) === all);

    /* ---------- plan (marqueurs, nuages, cercle) ------------------------ */
    await h.go('#/' + PLANE);
    const dots = () => page.$$eval('.plot-area svg circle', (n) => n.length);
    const d0 = await dots();
    await page.click('.legend-chip >> nth=0');
    await page.waitForTimeout(400);
    t('sur un plan aussi, le clic masque', (await dots()) < d0, `${d0} → ${await dots()}`);
    await page.click('.legend-chip >> nth=0');
    await page.waitForTimeout(400);
    t('et rallume', (await dots()) === d0);
    await page.click('.legend-chip >> nth=1');
    await page.waitForTimeout(400);
    t('le cercle guide s’éteint aussi', (await dots()) < d0, `${await dots()} points`);
  });
