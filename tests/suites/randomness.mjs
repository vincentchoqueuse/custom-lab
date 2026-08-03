// `random: true` gouverne l'interface, dans les deux sens.
//
// `npm run check` prouve que la déclaration correspond au générateur ; il
// ne peut pas voir si l'INTERFACE lui obéit. Une expérience qui ne tire
// rien ne doit avoir ni dé, ni champ seed, ni `?seed=`, et la touche R doit
// y être inerte — sinon le dé promet quelque chose qu'il ne peut pas tenir,
// vingt-trois fois dans le catalogue.
import { run, catalogue } from '../harness.mjs';

export default () =>
  run('randomness', async (t, page, h) => {
    for (const { key, random } of catalogue()) {
      await h.go(`#/${key}?drawer=1`, 450);
      const seen = await page.evaluate(() => ({
        dice: !!document.querySelector(
          '.actionbar [aria-label*="Draw" i], .actionbar [title*="Draw" i]'
        ),
        field: /seed/i.test(document.querySelector('.drawer')?.textContent ?? ''),
      }));
      t(`${key} · dé ${random ? 'présent' : 'absent'}`, seen.dice === random);
      t(`${key} · champ seed ${random ? 'présent' : 'absent'}`, seen.field === random);

      // R doit bouger l'URL si et seulement si l'expérience tire
      await h.go('#/' + key, 400);
      const before = await page.evaluate(() => location.hash);
      await page.click('.plot-card');
      await page.keyboard.press('r');
      await page.waitForTimeout(450);
      const after = await page.evaluate(() => location.hash);
      t(`${key} · R ${random ? 'tire' : 'inerte'}`, (before !== after) === random, `${before} → ${after}`);
    }
  });
