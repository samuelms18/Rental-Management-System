import { test, expect, type Page } from '@playwright/test';
import QRCode from 'qrcode';
import { signIn, signInStaff } from './helpers';

// Priya (seed, tenancy 40000…0002, advance ₹80,000) moves out. Requirements example: deductions ₹2,000 + ₹500 + ₹500.
test.describe.configure({ mode: 'serial' });
const T = '40000000-0000-4000-a000-000000000002';
let manager: Page;
let tenant: Page;
// Family rule: the last month's ₹15,000 rent is charged in full, whatever the move-out day.
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
const finalRent = 15000;
const refund = `₹${(80000 - 3000 - finalRent).toLocaleString('en-IN')}`;

test.beforeAll(async ({ browser }) => {
  manager = await (await browser.newContext()).newPage();
  tenant = await (await browser.newContext()).newPage();
  await signInStaff(manager, 'samuel@example.com');
});

test('manager records move-out, meter reading, photos and deductions', async () => {
  await manager.goto(`/owner/tenancies/${T}/move-out`);
  await manager.locator('input[name=move_out_date]').fill(today);
  await manager.locator('textarea[name=inspection_notes]').fill('Wall paint marks in bedroom; tap loose');
  await manager.locator('form:has(textarea[name=inspection_notes]) button[type=submit]').click();
  await expect(manager.getByText('Saved').first()).toBeVisible();

  // No advance recorded in the app for this older tenancy → enter it.
  await manager.locator('form:has-text("No advance is recorded") input[name=amount_paise]').fill('80000');
  await manager.locator('form:has-text("No advance is recorded") button[type=submit]').click();
  await expect(manager.getByText('Advance received').first()).toBeVisible();

  const photo = await QRCode.toBuffer('wall', { type: 'png' });
  await manager.locator('form:has(input[name=stage][value=move_out]) input[name=files]').setInputFiles({ name: 'wall.png', mimeType: 'image/png', buffer: photo });
  await manager.locator('form:has(input[name=files]) button[type=submit]').click();
  await expect(manager.getByText('At move-out').first()).toBeVisible();

  for (const [reason, amount] of [['Painting', '2000'], ['Tap damage', '500'], ['Cleaning', '500']]) {
    const form = manager.locator('form:has-text("Add a deduction")');
    await form.locator('input[name=reason]').fill(reason!);
    await form.locator('input[name=amount_paise]').fill(amount!);
    await form.getByRole('button', { name: 'Add' }).click();
    await expect(manager.getByText(reason!, { exact: true })).toBeVisible();
  }
  await manager.screenshot({ path: 'e2e/screens/10-move-out.png', fullPage: true });
});

test('statement is shared; unpaid rent comes out of the deposit; tenant acknowledges', async () => {
  await manager.getByRole('button', { name: 'Share statement with tenant' }).click();
  await expect(manager.getByText('Shared with tenant').first()).toBeVisible();
  // ₹80,000 − ₹3,000 deductions − this month's pro-rated unpaid rent
  await expect(manager.getByText(refund).first()).toBeVisible();

  await signIn(tenant, 'priya@example.com');
  await tenant.waitForURL(/\/tenant\/consent/); // Priya has not accepted the privacy notice yet (seed)
  await tenant.locator('input[name=accept]').check();
  await tenant.locator('form button[type=submit]').first().click();
  await tenant.waitForURL(/\/tenant$/);
  await tenant.goto('/tenant/settlement');
  await expect(tenant.getByText(refund).first()).toBeVisible();
  const pdf = await tenant.request.get(`/api/settlement/${T}`);
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
  await tenant.locator('form:has(input[name=decision][value=accept]) button[type=submit]').click();
  await expect(tenant.locator('form:has(input[name=decision][value=accept])')).toHaveCount(0);
});

test('manager settles: house vacant, tenant keeps read-only access to the statement', async () => {
  await manager.reload();
  await expect(manager.getByText('Acknowledged by tenant').first()).toBeVisible();
  manager.once('dialog', (d) => d.accept());
  await manager.locator('form:has-text("Record refund and settle") button[type=submit]').first().click();
  await expect(manager.getByText(/^Settled on /)).toBeVisible();
  await manager.goto('/owner/houses/20000000-0000-4000-a000-000000000002');
  await expect(manager.getByText('Vacant').first()).toBeVisible();

  await tenant.goto('/tenant');
  await expect(tenant.getByText("You don't have an active tenancy in the app.").or(tenant.getByText('செயலியில் உங்களுக்கு செயலில் உள்ள வாடகை ஒப்பந்தம் இல்லை.'))).toBeVisible();
  await tenant.goto('/tenant/settlement');
  await expect(tenant.getByText(refund).first()).toBeVisible();
});

test('daily purge endpoint is protected', async ({ request }) => {
  expect((await request.post('/api/cron/daily')).status()).toBe(401);
  const ok = await request.post('/api/cron/daily', { headers: { 'x-cron-secret': 'local-cron-secret-123' } });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toEqual({ purged_documents: 0, deleted_files: 0 });
});
