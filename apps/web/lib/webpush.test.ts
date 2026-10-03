import { describe, expect, it } from 'vitest';
import { b64url, encryptPayload, fromB64url, vapidAuthorization } from './webpush';

const enc = new TextEncoder();

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, n: number) {
  const k = await crypto.subtle.importKey('raw', ikm as BufferSource, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: salt as BufferSource, info: info as BufferSource }, k, n * 8));
}

describe('web push', () => {
  it('encrypts a payload the browser (user agent) can decrypt — RFC 8291 round trip', async () => {
    const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
    const auth = crypto.getRandomValues(new Uint8Array(16));
    const msg = JSON.stringify({ title: 'வாடகை', body: 'Rent ₹15,000 due' });

    const record = await encryptPayload(enc.encode(msg), { p256dh: b64url(uaPublic), auth: b64url(auth) });

    // Decrypt as the browser would.
    const salt = record.slice(0, 16);
    const rs = new DataView(record.buffer).getUint32(16);
    const idlen = record[20]!;
    const asPublic = record.slice(21, 21 + idlen);
    const cipher = record.slice(21 + idlen);
    expect(rs).toBe(4096);
    const asKey = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: asKey }, ua.privateKey, 256));
    const info = new Uint8Array([...enc.encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
    const ikm = await hkdf(auth, shared, info, 32);
    const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
    const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
    const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
    const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher));
    expect(plain[plain.length - 1]).toBe(2); // last-record delimiter
    expect(new TextDecoder().decode(plain.slice(0, -1))).toBe(msg);
  });

  it('signs a VAPID JWT the push service can verify', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
    const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
    const header = await vapidAuthorization('https://fcm.googleapis.com/fcm/send/abc', {
      publicKey: b64url(pub), privateKey: jwk.d!, subject: 'mailto:test@example.com',
    }, Date.UTC(2026, 9, 3));
    const [, jwt, k] = header.match(/^vapid t=([^,]+), k=(.+)$/)!;
    expect(k).toBe(b64url(pub));
    const [h, c, s] = jwt!.split('.');
    const claims = JSON.parse(new TextDecoder().decode(fromB64url(c!)));
    expect(claims.aud).toBe('https://fcm.googleapis.com');
    expect(claims.sub).toBe('mailto:test@example.com');
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, fromB64url(s!) as BufferSource, enc.encode(`${h}.${c}`));
    expect(ok).toBe(true);
  });
});
