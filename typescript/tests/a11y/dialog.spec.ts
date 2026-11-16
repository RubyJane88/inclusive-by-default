// Demo 2: a dialog that a scanner cannot judge.
// The test drives it by keyboard alone.
import { test } from '../../framework/fixtures';
import { assertModalFocusContract } from '../../framework/helpers';

test('delete dialog keeps focus', async ({ app }) => {
  await app.goto();
  await assertModalFocusContract(app, {
    trigger: 'Delete account',
    dialog: 'Delete your account?',
  });
});
