import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import QRCode from 'qrcode';
import { signIn, signInStaff } from './helpers';

test.describe.configure({ mode: 'serial' });
const DB = process.env.E2E_DB_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const sql = (q: string) => execFileSync('psql', [DB, '-Atc', q]).toString().trim();
const enc = new TextEncoder();
let manager: Page;
let tenant: Page;

test.beforeAll(async ({ browser }) => {
  manager = await (await browser.newContext()).newPage();
  tenant = await (await browser.newContext()).newPage();
  await signInStaff(manager, 'owner@example.com');
  await signIn(tenant, 'ravi@example.com');
  await tenant.waitForURL(/\/tenant$/);
});

test('a guest cannot be registered without an ID photo; with one, managers see them', async () => {
  await tenant.goto('/tenant/guests');
  await tenant.locator('input[name=name]').fill('Cousin Arjun');
  await tenant.getByRole('button', { name: 'Register guest' }).first().click();
  await expect(tenant.getByText('An ID photo is required for every guest, even for one night')).toBeVisible();
  const id = await QRCode.toBuffer('guest id', { type: 'png' });
  await tenant.locator('input[name=front]').setInputFiles({ name: 'id.png', mimeType: 'image/png', buffer: id });
  await tenant.getByRole('button', { name: 'Register guest' }).first().click();
  await expect(tenant.getByText('Guest registered. The managers have been informed.')).toBeVisible();
  await manager.goto('/owner/guests');
  await expect(manager.getByText('H01 · Cousin Arjun')).toBeVisible();
  await expect(manager.getByRole('link', { name: 'Aadhaar' })).toBeVisible();
});

test('announcement to one house → in-app + encrypted web push to the tenant’s phone', async () => {
  // A fake push service on :9911 receives what the app sends and decrypts it like a phone would.
  const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
  const auth = crypto.getRandomValues(new Uint8Array(16));
  const b64 = (b: Uint8Array) => Buffer.from(b).toString('base64url');
  const received: Array<{ headers: Record<string, unknown>; body: Buffer }> = [];
  const server: Server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      received.push({ headers: req.headers, body: Buffer.concat(chunks) });
      res.statusCode = 201;
      res.end();
    });
  }).listen(9911);

  try {
    sql(`insert into public.app_settings values ('push_dispatch_url', 'http://host.docker.internal:3000/api/push/dispatch'),
         ('push_dispatch_secret', 'local-push-secret-456') on conflict (key) do update set value = excluded.value`);
    sql(`insert into public.push_subscriptions (user_id, endpoint, keys) values ('00000000-0000-4000-a000-000000000011',
         'http://localhost:9911/push/ravi', '{"p256dh":"${b64(uaPublic)}","auth":"${b64(auth)}"}')`);

    await manager.goto('/owner/announcements');
    await manager.locator('select[name=target]').selectOption('house:20000000-0000-4000-a000-000000000001');
    await manager.locator('input[name=title]').fill('Water off on Sunday');
    await manager.locator('textarea[name=body]').fill('Tank cleaning from 10am to 1pm.');
    await manager.getByRole('button', { name: 'Send announcement' }).click();
    await expect(manager.getByText('Announcement sent.')).toBeVisible();

    await expect.poll(() => received.length, { timeout: 15_000 }).toBeGreaterThan(0);
    const { headers, body } = received[0]!;
    expect(String(headers.authorization)).toMatch(/^vapid t=.+, k=.+/);
    expect(headers['content-encoding']).toBe('aes128gcm');

    // Decrypt (RFC 8291) with the "phone's" private key.
    const salt = body.subarray(0, 16);
    const idlen = body[20]!;
    const asPublic = body.subarray(21, 21 + idlen);
    const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
    const hk = async (s: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) => {
      const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
      return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info }, k, n * 8));
    };
    const ikm = await hk(auth, shared, new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic]), 32);
    const cek = await hk(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hk(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, body.subarray(21 + idlen)));
    const message = JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
    expect(message.body).toBe('New announcement: Water off on Sunday');
    expect(message.url).toBe('/tenant/announcements');
  } finally {
    server.close();
    sql(`delete from public.app_settings`);
  }

  await tenant.goto('/tenant/announcements');
  await expect(tenant.getByText('Water off on Sunday')).toBeVisible();
  await manager.reload();
  await expect(manager.getByText('Read by 1')).toBeVisible();
});

test('a tenant in another house does not get the announcement', async ({ browser }) => {
  const other = await (await browser.newContext()).newPage();
  await signIn(other, 'priya@example.com');
  await other.waitForURL(/\/tenant/);
  await other.goto('/tenant/announcements');
  await expect(other.getByText('Water off on Sunday')).toHaveCount(0);
});
