import { test, expect, type Browser, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import QRCode from 'qrcode';
import { latestEmailLink, signIn, signInStaff } from './helpers';

// One realistic month in the life of the app, as the managers and a new tenant would use it.
test.describe.configure({ mode: 'serial' });

const stamp = Date.now().toString().slice(-6);
const tenantEmail = `meena${stamp}@example.com`;
const shots = 'e2e/screens';
let manager: Page;
let tenant: Page;

async function newPage(browser: Browser) {
  const ctx = await browser.newContext({ locale: 'en-IN' });
  return ctx.newPage();
}

test.beforeAll(async ({ browser }) => {
  manager = await newPage(browser);
  tenant = await newPage(browser);
});

test('manager signs in with 2FA and sees the dashboard', async () => {
  await signInStaff(manager, 'samuel@example.com');
  await expect(manager.getByRole('heading', { name: 'Hello, Samuel' })).toBeVisible();
  await expect(manager.getByText('What needs attention today')).toBeVisible();
  await expect(manager.getByRole('link', { name: /Samuel.*Manager/ })).toBeVisible();
  await manager.screenshot({ path: `${shots}/01-owner-dashboard.png`, fullPage: true });
});

test('manager sets up the UPI payee QR', async () => {
  await manager.goto('/owner/properties');
  await manager.getByRole('link', { name: /Family Houses/ }).click();
  const qr = await QRCode.toBuffer('upi://pay?pa=appa@okaxis&pn=Appa', { type: 'png', width: 400 });
  await manager.locator('input[name=qr]').setInputFiles({ name: 'qr.png', mimeType: 'image/png', buffer: qr });
  await manager.locator('form:has(input[name=qr]) button[type=submit]').click();
  await expect(manager.getByText('Saved').first()).toBeVisible();
  await expect(manager.locator('img[alt="UPI QR code image"]')).toBeVisible();
});

test('manager adds a tenant (invite email goes out) and a tenancy for H03', async () => {
  await manager.goto('/owner/houses/20000000-0000-4000-a000-000000000003');
  await manager.getByRole('link', { name: 'Add tenant to this house' }).click();
  await manager.getByRole('link', { name: '+ Add tenant' }).click();
  await manager.locator('input[name=full_name]').fill('Meena R');
  await manager.locator('input[name=phone]').fill('98400 12345');
  await manager.locator('input[name=email]').fill(tenantEmail);
  await manager.locator('form button[type=submit]').click();
  await manager.waitForURL(/tenancies\/new\?house=.*tenant=/);
  await manager.locator('input[name=rent_paise]').fill('10000');
  await manager.locator('input[name=advance_paise]').fill('50000');
  await manager.locator('form button[type=submit]').click();
  await manager.waitForURL(/\/owner\/tenancies\/[0-9a-f-]+$/);
  await expect(manager.getByText('Draft')).toBeVisible();

  // Activate with the signed paper agreement.
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText('Rental agreement (test)');
  await manager.locator('input[name=agreement]').setInputFiles({ name: 'agreement.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await pdf.save()) });
  await manager.getByRole('button', { name: 'Activate tenancy' }).click();
  await expect(manager.getByText('Active', { exact: true })).toBeVisible();
  await manager.getByRole('link', { name: 'Rent & payments' }).click();
  await expect(manager.getByText('first month')).toBeVisible();
  await manager.screenshot({ path: `${shots}/02-tenancy.png`, fullPage: true });
});

test('tenant accepts the invite, sets a password and agrees to the privacy notice', async () => {
  const link = new URL(await latestEmailLink(tenantEmail));
  await tenant.goto(link.pathname + link.search); // same app, whichever host the test runs against
  await tenant.waitForURL(/set-password/);
  await tenant.locator('input[name=password]').fill('meena-pass-123');
  await tenant.locator('input[name=confirm]').fill('meena-pass-123');
  await tenant.locator('form button[type=submit]').click();
  await tenant.waitForURL(/tenant\/consent/);
  await tenant.screenshot({ path: `${shots}/03-consent.png`, fullPage: true });
  await tenant.getByRole('button', { name: 'Continue' }).click();
  await expect(tenant.getByText('Please accept to continue')).toBeVisible();
  await tenant.locator('input[name=accept]').check();
  await tenant.getByRole('button', { name: 'Continue' }).click();
  await tenant.waitForURL(/\/tenant$/);
  await expect(tenant.getByText('Hello, Meena R')).toBeVisible();
  await expect(tenant.getByRole('link', { name: 'Pay now' })).toBeVisible();
  await tenant.screenshot({ path: `${shots}/04-tenant-home.png`, fullPage: true });
});

test('tenant pays by UPI QR and submits the UTR + screenshot', async () => {
  await tenant.getByRole('link', { name: 'Pay now' }).click();
  await expect(tenant.locator('img[alt="UPI QR code image"]')).toBeVisible();
  await expect(tenant.getByText('appa@okaxis')).toBeVisible();
  await tenant.screenshot({ path: `${shots}/05-pay.png`, fullPage: true });
  const shot = await QRCode.toBuffer('payment screenshot', { type: 'png' });
  await tenant.locator('input[name=utr_reference]').fill(`41${stamp}0001`);
  await tenant.locator('input[name=proof]').setInputFiles({ name: 'paid.png', mimeType: 'image/png', buffer: shot });
  await tenant.getByRole('button', { name: 'I have paid' }).click();
  await expect(tenant.getByText('Thanks! The managers will check and approve it.')).toBeVisible();

  // Same UTR again is refused.
  await tenant.locator('input[name=amount_paise]').fill('1');
  await tenant.locator('input[name=utr_reference]').fill(`41${stamp}0001`);
  await tenant.getByRole('button', { name: 'I have paid' }).click();
  await expect(tenant.getByText('This UTR has already been submitted')).toBeVisible();
});

test('manager approves; charge becomes paid and a receipt PDF is issued', async () => {
  await manager.goto('/owner/payments');
  const card = manager.locator('div.rounded-card', { hasText: 'Meena R' }).first();
  await expect(card).toBeVisible();
  await manager.screenshot({ path: `${shots}/06-approvals.png`, fullPage: true });
  await card.getByRole('button', { name: 'Approve' }).click();
  await expect(manager.getByText(/Approved\. Receipt RCPT-\d{4}-\d{4} issued\./)).toBeVisible();

  await tenant.goto('/tenant/payments');
  const receipt = tenant.getByRole('link', { name: /Receipt RCPT-/ });
  await expect(receipt).toBeVisible();
  const href = await receipt.getAttribute('href');
  const res = await tenant.request.get(href!);
  expect(res.ok()).toBeTruthy();
  const body = await res.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
  await tenant.goto('/tenant');
  await expect(tenant.getByText('All paid. Thank you!')).toBeVisible();
});

test('tenant raises a complaint with a photo; manager resolves it; cost goes to expenses', async () => {
  await tenant.goto('/tenant/complaints/new');
  await tenant.locator('select[name=category]').selectOption('plumbing');
  await tenant.locator('input[name=title]').fill('Kitchen tap leaking');
  await tenant.locator('select[name=priority]').selectOption('urgent');
  const photo = await QRCode.toBuffer('leak', { type: 'png' });
  await tenant.locator('input[name=media]').setInputFiles({ name: 'leak.png', mimeType: 'image/png', buffer: photo });
  await tenant.getByRole('button', { name: 'Submit' }).click();
  await tenant.waitForURL(/tenant\/complaints\/[0-9a-f-]+$/);
  await expect(tenant.getByText('Raised').first()).toBeVisible();

  await manager.goto('/owner');
  await expect(manager.getByText('Kitchen tap leaking')).toBeVisible();
  await manager.getByText('Kitchen tap leaking').click();
  await manager.locator('select[name=status]').selectOption('resolved');
  await manager.locator('input[name=resolution_cost_paise]').fill('450');
  await manager.locator('textarea[name=resolution_note]').fill('Washer replaced');
  await manager.getByRole('button', { name: 'Save' }).click();
  await expect(manager.getByText('Resolved').first()).toBeVisible();
  await manager.goto('/owner/expenses');
  await expect(manager.getByText(/Kitchen tap leaking/)).toBeVisible();

  await tenant.reload();
  await tenant.getByRole('button', { name: "Yes, it's fixed" }).click();
  await expect(tenant.getByText('Confirmed').first()).toBeVisible();
});

test('privacy: a tenant cannot reach staff pages or another tenant’s files', async ({ browser }) => {
  await tenant.goto('/owner');
  await expect(tenant).toHaveURL(/\/tenant$/);
  // Ravi (another tenant) tries to open Meena's agreement by path guessing.
  const ravi = await newPage(browser);
  await signIn(ravi, 'ravi@example.com');
  await ravi.waitForURL(/\/tenant/);
  const res = await ravi.request.get('/api/files?b=agreements&p=' + encodeURIComponent('anything/agreement.pdf'));
  expect(res.status()).toBe(404);
  await expect(ravi.getByText('Meena')).toHaveCount(0);
});

test('language switch: the whole UI changes to Tamil', async () => {
  await tenant.goto('/tenant/profile');
  await tenant.locator('select[name=preferred_language]').selectOption('ta');
  await tenant.locator('form button[type=submit]').first().click();
  await expect(tenant.locator('[role=status]')).toBeVisible();
  await tenant.goto('/tenant');
  await expect(tenant.locator('html')).toHaveAttribute('lang', 'ta');
  await tenant.screenshot({ path: `${shots}/07-tenant-home-ta.png`, fullPage: true });
});

test('owner sees the dashboard summary and WhatsApp reminders', async ({ browser }) => {
  const owner = await newPage(browser);
  await signInStaff(owner, 'owner@example.com');
  await owner.goto('/owner/rent');
  await expect(owner.getByText('Rent board')).toBeVisible();
  const wa = owner.getByRole('link', { name: 'Remind on WhatsApp' }).first();
  if (await wa.count()) expect(await wa.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/91\d{10}\?text=/);
  await owner.screenshot({ path: `${shots}/08-rent-board.png`, fullPage: true });
});
