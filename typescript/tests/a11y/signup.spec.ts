// Demo 1: the signup flow, reached the way assistive
// technology reaches it. axe runs after every test.
import { expect, test } from '../../framework/fixtures';

const ERROR = 'Enter an email address, like name@example.com';

test('email field is labelled', async ({ app }) => {
  await app.goto();
  const email = await app.textbox('Email');
  await email.fill('ada@example.com');
  await expect(email).toHaveValue('ada@example.com');
});

test('name field is labelled', async ({ app }) => {
  await app.goto();
  const name = await app.textbox('Name');
  await name.fill('Ada Lovelace');
  await expect(name).toHaveValue('Ada Lovelace');
});

test('submit is a named button', async ({ app }) => {
  await app.goto();
  await (await app.button('Create account')).press('Enter');
  await expect(await app.textbox('Email')).toHaveAccessibleDescription(ERROR);
});

test('page loads clean', async ({ app }) => {
  // Nothing to do here: the axe check after the test
  // reports language, title, alt text and contrast.
  await app.goto();
});
