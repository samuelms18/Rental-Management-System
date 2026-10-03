#!/usr/bin/env node
// Downloads every object from every Storage bucket into <outDir>/<bucket>/<path>.
// Used by the weekly backup workflow. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const outDir = process.argv[2] ?? 'storage-backup';
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function walk(bucket, prefix = '') {
  const files = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
    if (error) throw error;
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) files.push(...(await walk(bucket, path))); // folder
      else files.push(path);
    }
    if (data.length < 1000) break;
  }
  return files;
}

const { data: buckets, error } = await admin.storage.listBuckets();
if (error) throw error;
let total = 0;
for (const b of buckets) {
  const paths = await walk(b.id);
  for (const p of paths) {
    const { data, error: e } = await admin.storage.from(b.id).download(p);
    if (e) throw new Error(`${b.id}/${p}: ${e.message}`);
    const target = join(outDir, b.id, p);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, Buffer.from(await data.arrayBuffer()));
    total++;
  }
  console.log(`${b.id}: ${paths.length} files`);
}
console.log(`Downloaded ${total} files`);
