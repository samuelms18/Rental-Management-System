import { describe, expect, it } from 'vitest';
import en from '../messages/en.json';
import ta from '../messages/ta.json';
import hi from '../messages/hi.json';
import ml from '../messages/ml.json';

function flatten(obj: unknown, prefix = ''): Map<string, string> {
  const out = new Map<string, string>();
  if (obj && typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (typeof v === 'string') out.set(key, v);
      else for (const [kk, vv] of flatten(v, key)) out.set(kk, vv);
    }
  }
  return out;
}

const placeholders = (s: string) =>
  [...s.matchAll(/\{(\w+)/g)].map((m) => m[1]).filter((p) => !['plural', 'one', 'other'].includes(p!)).sort();

const base = flatten(en);

describe.each([
  ['ta', ta],
  ['hi', hi],
  ['ml', ml],
])('%s translation', (_name, messages) => {
  const other = flatten(messages);
  it('has every English key', () => {
    expect([...base.keys()].filter((k) => !other.has(k))).toEqual([]);
  });
  it('has no extra keys', () => {
    expect([...other.keys()].filter((k) => !base.has(k))).toEqual([]);
  });
  it('keeps the same {placeholders}', () => {
    const wrong = [...base.entries()]
      .filter(([k, v]) => other.has(k) && placeholders(v).join() !== placeholders(other.get(k)!).join())
      .map(([k]) => k);
    expect(wrong).toEqual([]);
  });
});
