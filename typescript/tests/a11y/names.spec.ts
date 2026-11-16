// Demo 3: names that exist and say nothing.
// axe checks that a name is there. These check that it
// means something.
import { test } from '../../framework/fixtures';
import { assertNamesMeaningful } from '../../framework/helpers';

test('buttons have meaningful names', async ({ app }) => {
  await app.goto();
  // Open the dialog so its close button is checked too.
  await (await app.button('Delete account')).click();
  await assertNamesMeaningful(app, 'button');
});

test('images have meaningful names', async ({ app }) => {
  await app.goto();
  await assertNamesMeaningful(app, 'img');
});
