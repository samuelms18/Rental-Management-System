#!/usr/bin/env node
// Generates a VAPID key pair for web push. Put the output in the app's environment.
const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
const pub = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
const b64url = (b) => Buffer.from(b).toString('base64url');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${b64url(pub)}`);
console.log(`VAPID_PRIVATE_KEY=${jwk.d}`);
