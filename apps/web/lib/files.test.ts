import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({}) }));
const { sniff, stripMetadata } = await import('./files');

function webp(withExif: boolean): Uint8Array {
  const chunk = (id: string, data: number[]) => {
    const size = data.length;
    const pad = size % 2 ? [0] : [];
    return [...id].map((c) => c.charCodeAt(0)).concat([size & 255, (size >> 8) & 255, 0, 0], data, pad);
  };
  const vp8x = chunk('VP8X', [withExif ? 0x08 : 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const exif = withExif ? chunk('EXIF', [1, 2, 3, 4, 5]) : [];
  const img = chunk('VP8L', [9, 9, 9, 9]);
  const body = [...'WEBP'].map((c) => c.charCodeAt(0)).concat(vp8x, exif, img);
  const len = body.length;
  return new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([len & 255, (len >> 8) & 255, 0, 0], body));
}

describe('file checks', () => {
  it('detects types by content', () => {
    expect(sniff(webp(false))).toBe('webp');
    expect(sniff(new TextEncoder().encode('%PDF-1.7 ...'))).toBe('pdf');
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
    expect(sniff(new TextEncoder().encode('<html>'))).toBeNull();
  });
  it('removes EXIF from WebP and fixes the RIFF size', () => {
    const out = stripMetadata('webp', webp(true));
    const text = String.fromCharCode(...out);
    expect(text.includes('EXIF')).toBe(false);
    expect(text.includes('VP8L')).toBe(true);
    expect(new DataView(out.buffer).getUint32(4, true)).toBe(out.length - 8);
    expect(out[20]! & 0x08).toBe(0);
  });
  it('removes APP1 (EXIF) from JPEG', () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x04, 0xaa, 0xbb, 0xff, 0xdb, 0x00, 0x03, 0x01, 0xff, 0xda, 0x00, 0x02, 0x55]);
    const out = stripMetadata('jpeg', jpeg);
    expect(Array.from(out)).toEqual([0xff, 0xd8, 0xff, 0xdb, 0x00, 0x03, 0x01, 0xff, 0xda, 0x00, 0x02, 0x55]);
  });
});
