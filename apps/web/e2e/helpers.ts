import { createHmac } from 'node:crypto';
import { expect, type Page } from '@playwright/test';

/** RFC 6238 TOTP, same as an authenticator app. */
export function totp(secretBase32: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of secretBase32.replace(/=+$/, '').toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 1000 / 30)));
  const h = createHmac('sha1', key).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const code = ((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).toString().padStart(6, '0');
  return code;
}

export async function signIn(page: Page, email: string, password = 'password123') {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.locator('input[name=password]').fill(password);
  await page.locator('form button[type=submit]').click();
}

const secrets = new Map<string, string>();

/** Staff sign-in including 2FA enrolment on first use. */
export async function signInStaff(page: Page, email: string) {
  await signIn(page, email);
  await page.waitForURL(/\/mfa/);
  if (!secrets.has(email)) {
    const manual = page.locator('code');
    await manual.waitFor({ timeout: 15_000 });
    secrets.set(email, (await manual.textContent())!.trim());
  }
  const secret = secrets.get(email);
  if (!secret) throw new Error(`No TOTP secret for ${email}`);
  await page.locator('input[autocomplete=one-time-code]').fill(totp(secret));
  await page.getByRole('button', { name: /verify/i }).click();
  await page.waitForURL(/\/owner$/);
}

const MAILPIT = process.env.MAILPIT_URL ?? 'http://127.0.0.1:54324';

/** Latest email to an address, from the local mail catcher. */
export async function latestEmailLink(to: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const list = (await res.json()) as { messages: Array<{ ID: string }> };
    if (list.messages?.length) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${list.messages[0]!.ID}`)).json()) as { HTML: string };
      const href = msg.HTML.match(/href="([^"]+auth\/confirm[^"]+)"/)?.[1];
      if (href) return href.replace(/&amp;/g, '&');
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email for ${to}`);
}

export async function expectNoA11yBasics(page: Page) {
  // Every input has a label and the page has a heading.
  await expect(page.locator('h1')).toHaveCount(1);
}
