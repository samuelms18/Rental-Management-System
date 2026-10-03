import { test, expect, type Page } from '@playwright/test';
import { PDFDocument } from 'pdf-lib';
import { signIn, signInStaff } from './helpers';

test.describe.configure({ mode: 'serial' });
const RAVI_TENANCY = '40000000-0000-4000-a000-000000000001';
let manager: Page;
let tenant: Page;
let agreementUrl = '';

test.beforeAll(async ({ browser }) => {
  manager = await (await browser.newContext()).newPage();
  tenant = await (await browser.newContext()).newPage();
  await signInStaff(manager, 'brother@example.com');
});

test('manager creates an agreement from the template, makes the PDF and sends it', async () => {
  await manager.goto(`/owner/tenancies/${RAVI_TENANCY}`);
  await manager.getByRole('link', { name: 'New agreement' }).click();
  await manager.getByRole('button', { name: 'Create agreement' }).click();
  await manager.waitForURL(/\/owner\/agreements\/[0-9a-f-]+$/);
  agreementUrl = manager.url();
  await expect(manager.getByText('Draft', { exact: true })).toBeVisible();
  await expect(manager.locator('textarea[name=body_text]')).toContainText('Ravi Kumar');
  await expect(manager.locator('textarea[name=body_text]')).toContainText('Appa (Owner)');
  await expect(manager.locator('textarea[name=body_text]')).not.toContainText('{{');
  await manager.getByRole('button', { name: 'Create PDF' }).click();
  await expect(manager.getByText('Ready to send')).toBeVisible();
  await manager.getByRole('button', { name: 'Send to tenant' }).click();
  await expect(manager.getByText('Waiting for the tenant to sign.')).toBeVisible();
  await expect(manager.getByRole('link', { name: 'Tell the tenant on WhatsApp' })).toHaveAttribute('href', /wa\.me\/919840000011/);
  const pdf = await manager.request.get(agreementUrl.replace('/owner/agreements/', '/api/agreements/') + '/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');
});

test('tenant reads it and signs with a finger-drawn signature', async () => {
  await signIn(tenant, 'ravi@example.com');
  await tenant.waitForURL(/\/tenant/);
  await tenant.goto('/tenant/agreement');
  await expect(tenant.getByText('Waiting for signature')).toBeVisible();
  await tenant.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(tenant.getByText('Please sign in the box').or(tenant.getByText('Please accept to continue')).first()).toBeVisible();
  const box = (await tenant.locator('canvas').boundingBox())!;
  await tenant.mouse.move(box.x + 20, box.y + 100);
  await tenant.mouse.down();
  for (let i = 0; i < 12; i++) await tenant.mouse.move(box.x + 30 + i * 18, box.y + 60 + (i % 2) * 40);
  await tenant.mouse.up();
  await tenant.locator('input[name=accept]').check();
  await tenant.getByRole('button', { name: 'Sign', exact: true }).click();
  await expect(tenant.getByText('Thank you. The owner will review and approve it.')).toBeVisible();
});

test('manager approves; agreement becomes active; stamped copy uploaded; signed PDF has the signature', async () => {
  await manager.goto(agreementUrl);
  await expect(manager.getByText('Signed', { exact: true })).toBeVisible();
  await manager.getByRole('button', { name: 'Approve' }).click();
  await expect(manager.getByText('Active', { exact: true })).toBeVisible();
  const scan = await PDFDocument.create();
  scan.addPage().drawText('Stamped agreement');
  await manager.locator('input[name=stamped]').setInputFiles({ name: 'stamped.pdf', mimeType: 'application/pdf', buffer: Buffer.from(await scan.save()) });
  await manager.getByRole('button', { name: 'Upload' }).click();
  await expect(manager.getByRole('link', { name: 'Stamped / registered copy' })).toBeVisible();
  const signed = await manager.request.get(agreementUrl.replace('/owner/agreements/', '/api/agreements/') + '/pdf');
  const doc = await PDFDocument.load(await signed.body());
  expect(doc.getPageCount()).toBeGreaterThan(1);
  await manager.screenshot({ path: 'e2e/screens/09-agreement.png', fullPage: true });
});
