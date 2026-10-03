import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { signInStaff } from './helpers';

const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q: string) => execFileSync('psql', [DB, '-Atc', q]).toString().trim();

test('reports: totals, chart, CSV with BOM (Tamil names) and PDF; house history with meter chart', async ({ page }) => {
  // A tenant with a Tamil name and a few months of rent, part paid; meter readings; a big repair.
  sql(`update public.tenants set full_name = 'ரவி குமார்' where id = '30000000-0000-4000-a000-000000000001'`);
  sql(`select public.generate_rent_charges((date_trunc('month', public.today_ist()) + interval '1 month' + interval '1 day')::date)`);
  sql(`insert into public.meter_readings (house_id, reading, read_on) values
       ('20000000-0000-4000-a000-000000000001', 1000, public.today_ist() - 120),
       ('20000000-0000-4000-a000-000000000001', 1310, public.today_ist() - 60),
       ('20000000-0000-4000-a000-000000000001', 1580, public.today_ist())`);
  sql(`insert into public.expenses (property_id, house_id, category, amount_paise, spent_on, description) values
       ('10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 'painting', 1200000, public.today_ist(), 'Full repaint')`);

  await signInStaff(page, 'samuel@example.com');
  await page.goto('/owner/reports');
  await expect(page.getByRole('heading', { name: 'Reports' })).toBeVisible();
  await expect(page.locator('svg[role=img]').first()).toBeVisible();
  const expectedDb = Number(sql(`select coalesce(sum(amount_paise),0) from public.charges where type='rent' and status <> 'cancelled'
    and period_start between date_trunc('year', public.today_ist()) and public.today_ist()`));
  await expect(page.getByText(`₹${(expectedDb / 100).toLocaleString('en-IN')}`).first()).toBeVisible();
  await page.screenshot({ path: 'e2e/screens/11-reports.png', fullPage: true });

  const csv = await page.request.get('/api/reports/rent');
  const bytes = await csv.body();
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  expect(bytes.toString('utf8')).toContain('Month,House,Property');
  const dep = await page.request.get('/api/reports/net');
  expect(dep.headers()['content-type']).toContain('text/csv');
  const pdf = await page.request.get('/api/reports/pdf');
  expect((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');

  await page.goto('/owner/houses/20000000-0000-4000-a000-000000000001');
  await expect(page.getByText('Electricity units between readings')).toBeVisible();
  await expect(page.getByText(/Major repair · Full repaint/)).toBeVisible();
  await expect(page.getByText(/Moved in · ரவி குமார்/)).toBeVisible();
  await page.screenshot({ path: 'e2e/screens/12-house-history.png', fullPage: true });
});

test('a tenant cannot download reports', async ({ browser }) => {
  const p = await (await browser.newContext()).newPage();
  await p.goto('/login');
  await p.getByLabel(/email/i).fill('ravi@example.com');
  await p.locator('input[name=password]').fill('password123');
  await p.locator('form button[type=submit]').click();
  await p.waitForURL(/\/tenant/);
  expect((await p.request.get('/api/reports/rent')).status()).toBe(403);
  await p.goto('/owner/reports');
  await expect(p).toHaveURL(/\/tenant$/);
});
