#!/usr/bin/env node
// Uploads files from a backup folder (<dir>/<bucket>/<path>) back into Storage. Existing files are kept.
// SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/restore-storage.mjs backup/storage
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, relative, extname } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const dir = process.argv[2];
if (!dir) throw new Error('Usage: node scripts/restore-storage.mjs <backup/storage>');
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const TYPES = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.pdf': 'application/pdf', '.mp4': 'video/mp4' };

async function* files(d) {
  for (const name of await readdir(d)) {
    const p = join(d, name);
    if ((await stat(p)).isDirectory()) yield* files(p);
    else yield p;
  }
}

let n = 0;
for (const bucket of await readdir(dir)) {
  for await (const file of files(join(dir, bucket))) {
    const path = relative(join(dir, bucket), file).split('\\').join('/');
    const { error } = await admin.storage.from(bucket).upload(path, await readFile(file), {
      contentType: TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream',
      upsert: false,
    });
    if (error && !/exists/i.test(error.message)) throw new Error(`${bucket}/${path}: ${error.message}`);
    n++;
  }
}
console.log(`Restored ${n} files`);
