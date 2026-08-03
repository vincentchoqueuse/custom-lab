// Tout le catalogue, dans le bundle construit : chaque vue de chaque
// expérience dessine, chaque scène se rejoue, `?view=` fait l'aller-retour.
//
// C'est la suite qui attrape ce qu'aucune vérification numérique ne peut
// voir : une vue qui référence un observable disparu (elle rend un cadre
// vide, pas une erreur), une scène qui ouvre un onglet supprimé, un
// `?view=` qui ne pointe plus nulle part. Toutes ces pannes se ressemblent
// à l'écran — un graphe absent — et aucune ne fait échouer `npm run check`.
import { run, catalogue } from '../harness.mjs';

export default () =>
  run('catalogue', async (t, page, h) => {
    const keys = catalogue();
    let views = 0;
    let scenes = 0;

    for (const { key } of keys) {
      await h.go('#/' + key);
      const tabs = await h.tabs();
      const n = Math.max(tabs.length, 1);

      for (let i = 0; i < n; i++) {
        if (tabs.length) {
          await page.click(`.tabs button >> nth=${i}`);
          await page.waitForTimeout(600);
        }
        views++;
        const marks = await h.marks();
        const st = await h.statline();
        t(
          `${key} « ${tabs[i] ?? '—'} » dessine`,
          marks > 2 && !/⚠|abandon/i.test(st),
          `${marks} marques`
        );
        // l'onglet ouvert doit être celui que l'URL désigne : c'est ce qui
        // rend un lien de cours reproductible
        const hash = await page.evaluate(() => location.hash);
        const id = hash.match(/[?&]view=([^&]*)/)?.[1];
        if (id) {
          await h.go(`#/${key}?view=${id}`);
          const active = await page.$$eval('.tabs button.active', (b) =>
            b.map((x) => x.textContent.trim())
          );
          t(`${key} ?view=${id} rouvre le même onglet`, active[0] === tabs[i], `→ ${active[0]}`);
        }
      }
    }

    for (const { key } of keys) {
      await h.go('#/' + key);
      if (!(await page.$('.preset-picker button'))) continue;
      await page.click('.preset-picker button');
      await page.waitForTimeout(250);
      const count = await page.$$eval('.preset-picker .menu button', (x) => x.length);
      await page.keyboard.press('Escape');
      for (let i = 0; i < count; i++) {
        await page.click('.preset-picker button');
        await page.waitForTimeout(200);
        await page.click(`.preset-picker .menu button >> nth=${i}`);
        await page.waitForTimeout(350);
        scenes++;
        const marks = await h.marks();
        const st = await h.statline();
        t(`${key} scène ${i + 1}/${count}`, marks > 2 && !/⚠|abandon/i.test(st), `${marks} marques`);
      }
    }
    console.log(`  ${keys.length} expériences · ${views} vues · ${scenes} scènes`);
  });
