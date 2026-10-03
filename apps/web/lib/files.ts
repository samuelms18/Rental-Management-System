import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export type Bucket =
  | 'house-photos'
  | 'tenant-photos'
  | 'identity-docs'
  | 'agreements'
  | 'payee'
  | 'payment-proofs'
  | 'receipts'
  | 'complaint-media'
  | 'expense-receipts'
  | 'tenancy-photos'
  | 'people-photos';

type Kind = 'webp' | 'jpeg' | 'png' | 'pdf' | 'mp4';
const MIME: Record<Kind, string> = {
  webp: 'image/webp',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
  mp4: 'video/mp4',
};

const MB = 1024 * 1024;
export const ALLOW = {
  image: { kinds: ['webp', 'jpeg', 'png'] as Kind[], maxBytes: 10 * MB },
  imageOrPdf: { kinds: ['webp', 'jpeg', 'png', 'pdf'] as Kind[], maxBytes: 10 * MB },
  media: { kinds: ['webp', 'jpeg', 'png', 'mp4'] as Kind[], maxBytes: 50 * MB },
};

/** Detect the real file type from its first bytes (never trust the browser's MIME type). */
export function sniff(b: Uint8Array): Kind | null {
  const ascii = (from: number, len: number) => String.fromCharCode(...b.subarray(from, from + len));
  if (b.length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'webp';
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg';
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 3) === 'PNG') return 'png';
  if (b.length >= 5 && ascii(0, 5) === '%PDF-') return 'pdf';
  if (b.length >= 12 && ascii(4, 4) === 'ftyp') return 'mp4';
  return null;
}

/** Remove EXIF/XMP (GPS location etc.) from WebP, JPEG and PNG. */
export function stripMetadata(kind: Kind, input: Uint8Array): Uint8Array {
  if (kind === 'webp') return stripWebp(input);
  if (kind === 'jpeg') return stripJpeg(input);
  if (kind === 'png') return stripPng(input);
  return input;
}

function stripWebp(b: Uint8Array): Uint8Array {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const chunks: Uint8Array[] = [];
  let off = 12;
  while (off + 8 <= b.length) {
    const id = String.fromCharCode(...b.subarray(off, off + 4));
    const size = dv.getUint32(off + 4, true);
    const total = 8 + size + (size % 2);
    const chunk = b.slice(off, Math.min(off + total, b.length));
    if (id === 'VP8X') chunk[8] = chunk[8]! & ~0x0c; // clear EXIF + XMP flags
    if (id !== 'EXIF' && id !== 'XMP ') chunks.push(chunk);
    off += total;
  }
  const bodyLen = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(12 + bodyLen);
  out.set(b.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, 4 + bodyLen, true);
  let p = 12;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

function stripJpeg(b: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [b.subarray(0, 2)];
  let off = 2;
  while (off + 4 <= b.length && b[off] === 0xff) {
    const marker = b[off + 1]!;
    if (marker === 0xda) break; // start of scan: rest is image data
    const len = (b[off + 2]! << 8) | b[off + 3]!;
    const isMeta = marker === 0xe1 || marker === 0xed || (marker >= 0xe2 && marker <= 0xef && marker !== 0xe2);
    if (!isMeta) parts.push(b.subarray(off, off + 2 + len));
    off += 2 + len;
  }
  parts.push(b.subarray(off));
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let p = 0;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

function stripPng(b: Uint8Array): Uint8Array {
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let off = 8;
  while (off + 12 <= b.length) {
    const len = dv.getUint32(off);
    const type = String.fromCharCode(...b.subarray(off + 4, off + 8));
    const total = 12 + len;
    if (!['eXIf', 'tEXt', 'iTXt', 'zTXt', 'tIME'].includes(type)) parts.push(b.subarray(off, off + total));
    off += total;
  }
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let p = 0;
  for (const part of parts) {
    out.set(part, p);
    p += part.length;
  }
  return out;
}

export type UploadResult = { ok: true; path: string; kind: Kind } | { ok: false; error: 'file_type' | 'file_size' | 'file_required' | 'generic' };

/** Validate (type by content, size), strip metadata and store in a private bucket. Caller must check access first. */
export async function uploadFile(
  bucket: Bucket,
  folder: string,
  file: FormDataEntryValue | null,
  allow: { kinds: Kind[]; maxBytes: number },
): Promise<UploadResult> {
  if (!file || typeof file === 'string' || file.size === 0) return { ok: false, error: 'file_required' };
  if (file.size > allow.maxBytes) return { ok: false, error: 'file_size' };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind || !allow.kinds.includes(kind)) return { ok: false, error: 'file_type' };
  const clean = stripMetadata(kind, bytes);
  const path = `${folder}/${crypto.randomUUID()}.${kind === 'jpeg' ? 'jpg' : kind}`;
  const { error } = await createAdminClient().storage.from(bucket).upload(path, clean, {
    contentType: MIME[kind],
    upsert: false,
  });
  if (error) return { ok: false, error: 'generic' };
  return { ok: true, path, kind };
}

/** True when a form field holds a non-empty file. */
export function hasFile(v: FormDataEntryValue | null): v is File {
  return !!v && typeof v !== 'string' && v.size > 0;
}

export async function removeFiles(bucket: Bucket, paths: string[]) {
  if (paths.length) await createAdminClient().storage.from(bucket).remove(paths);
}
