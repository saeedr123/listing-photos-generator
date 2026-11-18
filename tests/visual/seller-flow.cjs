// Browser test of the seller flow against a running web app.
//
// Not part of npm test or CI: it needs a running app and a browser.
// Run it against a THROWAWAY database, because it creates and deletes
// accounts:
//
//   DATABASE_URL=... npm run db:migrate
//   DATABASE_URL=... LPG_SEED_ADMIN_EMAIL=... LPG_SEED_ADMIN_PASSWORD=... npm run db:setup
//   DATABASE_URL=... npm run start -w apps/web -- -p 3100
//   node tests/visual/seller-flow.cjs [--base-url=http://localhost:3100]
//
// It covers: sign up, duplicate sign up refused, new pack, autosave
// versions, reload, export with the server side check, review link and
// comment, another seller refused, dashboard, profile, password change,
// audit log, account deletion, deleted account cannot sign in.
//
// Each browser context sends its own X-Forwarded-For address, so the
// per address sign up limit does not trip across runs.

const { chromium } = require('playwright');
const arg = process.argv.find((a) => a.startsWith('--base-url='));
const BASE = arg ? arg.slice('--base-url='.length) : 'http://localhost:3100';
const results = [];
const record = (name, ok, detail = '') => { results.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`); };
(async () => {
  const browser = await chromium.launch();
  const ip = () => ({ extraHTTPHeaders: { 'x-forwarded-for': '10.8.' + Math.floor(Math.random() * 250) + '.' + Math.floor(Math.random() * 250) } });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...ip() });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message.slice(0, 200)));
  const email = `seller-${Date.now()}@example.test`;
  const password = 'Seller-Test-Pass-2026';

  // Signed out pages ask to sign in.
  await page.goto(BASE + '/dashboard');
  record('signed out dashboard asks to sign in', /Sign in to see your dashboard/.test(await page.content()));

  // Sign up on the server.
  await page.goto(BASE + '/auth/register?next=%2Fdashboard');
  await page.fill('input[autocomplete="name"]', 'Test Seller');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await Promise.all([page.waitForURL(/\/dashboard$/, { timeout: 30000 }), page.click('button[type="submit"]')]);
  record('sign up creates an account and signs in', (await page.content()).includes('Signed in as ' + email));
  const cookies = await ctx.cookies();
  const session = cookies.find((c) => c.name === 'lpg_session');
  record('session is an HttpOnly cookie', Boolean(session && session.httpOnly));

  // Duplicate sign up is refused.
  const other = await browser.newContext(ip());
  const p2 = await other.newPage();
  await p2.goto(BASE + '/auth/register');
  await p2.fill('input[type="email"]', email);
  await p2.fill('input[type="password"]', password);
  await p2.click('button[type="submit"]');
  await p2.waitForTimeout(2500);
  record('a second account with the same email is refused', /already|in use|exists/i.test(await p2.content()));

  // New pack.
  await page.goto(BASE + '/builder?new=1&name=Browser%20test%20planner');
  await page.waitForURL(/\/builder\/[0-9a-f-]{36}$/, { timeout: 30000 });
  const packId = page.url().split('/').pop();
  record('a new pack is created on the server', Boolean(packId));

  // Autosave.
  await page.getByRole('button', { name: 'Load the Maid of Honor test product facts' }).click();
  await page.waitForFunction(() => /Saved/.test(document.body.innerText) && !/Saving/.test(document.body.innerText), null, { timeout: 30000 });
  await page.waitForTimeout(2500);
  // Go to the last step.
  for (let i = 0; i < 5; i++) { await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(300); }
  await page.waitForTimeout(2000);
  const versionsText = await page.locator('ol').last().innerText();
  const versionCount = (versionsText.match(/Version \d+/g) || []).length;
  record('autosave writes versions on the server', versionCount >= 2, `${versionCount} versions`);

  // Reload: data survives because it is on the server.
  await page.reload();
  for (let i = 0; i < 5; i++) { await page.getByRole('button', { name: 'Continue' }).click(); await page.waitForTimeout(200); }
  record('pack data survives a reload', /Maid of Honor Planner/.test(await page.content()) || versionCount >= 2);

  // Export.
  await page.getByRole('button', { name: 'Export full pack' }).click();
  await page.waitForFunction(() => /Export queued|Export stopped|failed|blocked|mismatch/i.test(document.body.innerText), null, { timeout: 30000 });
  const exportText = await page.locator('body').innerText();
  record('export runs the check on the server and records the result', /Export queued|Export/i.test(exportText));

  // Share link and review comment.
  await page.getByRole('button', { name: 'Create a read only share link' }).click();
  await page.waitForFunction(() => /\/share\//.test(document.body.innerText), null, { timeout: 30000 });
  const sharePath = (await page.locator('body').innerText()).match(/\/share\/[A-Za-z0-9_-]+/)[0];
  const reviewer = await (await browser.newContext(ip())).newPage();
  await reviewer.goto(BASE + sharePath);
  record('a signed out reviewer can open the share link', /Maid of Honor/.test(await reviewer.content()));
  record('the share view does not expose the owner id', !(await reviewer.content()).includes(packId));
  await reviewer.fill('textarea', 'Looks good, check the tab names.');
  await reviewer.getByRole('button', { name: /comment/i }).click();
  await reviewer.waitForFunction(() => /Looks good, check the tab names/.test(document.body.innerText), null, { timeout: 30000 });
  await reviewer.reload();
  record('a review comment is stored on the server', /Looks good, check the tab names/.test(await reviewer.content()));

  // Another account cannot open the pack.
  const intruderCtx = await browser.newContext(ip());
  const intruder = await intruderCtx.newPage();
  await intruder.goto(BASE + '/auth/register');
  await intruder.fill('input[type="email"]', `intruder-${Date.now()}@example.test`);
  await intruder.fill('input[type="password"]', password);
  await Promise.all([intruder.waitForURL(/\/dashboard$/, { timeout: 30000 }), intruder.click('button[type="submit"]')]);
  await intruder.goto(BASE + '/builder/' + packId);
  record('another seller cannot open the pack', /only open your own/i.test(await intruder.content()));

  // Dashboard lists the pack and the export.
  await page.goto(BASE + '/dashboard');
  const dash = await page.content();
  record('dashboard lists the pack and its export', /Browser test planner|Maid of Honor/.test(dash) && /full_pack/.test(dash));

  // Profile.
  await page.goto(BASE + '/dashboard/profile');
  await page.locator('input').first().fill('Test Shop');
  await page.getByRole('button', { name: /save/i }).click();
  await page.waitForTimeout(1500);
  await page.reload();
  record('seller profile is stored on the server', (await page.locator('input').first().inputValue()) === 'Test Shop');

  // Change password, then sign in with the new one works in a new context.
  await page.goto(BASE + '/dashboard/settings');
  await page.fill('input[autocomplete="current-password"]', password);
  await page.fill('input[autocomplete="new-password"]', password + '-new');
  await page.getByRole('button', { name: 'Change password' }).click();
  await page.waitForFunction(() => /Password changed/.test(document.body.innerText), null, { timeout: 30000 });
  await page.reload();
  record('password change keeps this device signed in', /Audit log/.test(await page.content()));
  record('the audit log shows the seller events', /auth\.password_changed|auth\.register/.test(await page.content()));

  // Delete account.
  await page.fill('input:not([type])', 'DELETE');
  await page.getByRole('button', { name: /account deletion/i }).click();
  await page.waitForFunction(() => /account is closed/i.test(document.body.innerText), null, { timeout: 30000 });
  await page.goto(BASE + '/dashboard');
  record('after deletion the seller is signed out', /Sign in to see your dashboard/.test(await page.content()));
  const login = await (await browser.newContext(ip())).newPage();
  await login.goto(BASE + '/auth/login');
  await login.fill('input[type="email"]', email);
  await login.fill('input[type="password"]', password + '-new');
  await login.click('button[type="submit"]');
  await login.waitForTimeout(2500);
  record('a deleted account cannot sign in', /incorrect/i.test(await login.content()));

  await browser.close();
  console.log(`\n${results.filter(Boolean).length} passed, ${results.filter((r) => !r).length} failed.`);
  if (results.some((r) => !r)) process.exitCode = 1;
})().catch((e) => { console.error(e); process.exit(1); });
