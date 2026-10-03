import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

/** Rupee text from a form → integer paise. */
export const rupees = z.preprocess(
  (v) => {
    if (typeof v === 'number') return Math.round(v * 100);
    if (typeof v !== 'string') return v;
    const s = v.replace(/[₹,\s]/g, '');
    if (s === '') return undefined;
    if (!/^\d{1,11}(\.\d{1,2})?$/.test(s)) return NaN;
    const [whole, frac = ''] = s.split('.');
    return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
  },
  z.number({ error: 'invalid_amount' }).int().nonnegative('invalid_amount'),
);
export const positiveRupees = rupees.refine((v) => v > 0, 'amount_required');

export const phone = z
  .string()
  .transform((s) => s.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, ''))
  .pipe(z.string().regex(/^[6-9]\d{9}$/, 'invalid_phone'));
export const optionalPhone = z.preprocess(emptyToUndefined, phone.optional());

export const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'invalid_date');
export const optionalDate = z.preprocess(emptyToUndefined, isoDate.optional());
export const uuid = z.uuid();
export const optionalUuid = z.preprocess(emptyToUndefined, z.uuid().optional());

export const text = (max = 200) => z.string().trim().min(1, 'required').max(max);
export const optionalText = (max = 2000) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
export const optionalInt = (min: number, max: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).max(max).optional());

export const checkbox = z.preprocess((v) => v === 'on' || v === 'true' || v === true, z.boolean());

/** Last 4 of an ID number only. Anything longer is rejected (the client must mask first). */
export const idLast4 = z.preprocess(
  emptyToUndefined,
  z.string().regex(/^[0-9A-Za-z]{4}$/, 'id_last4_only').optional(),
);

export const pin = z.preprocess(emptyToUndefined, z.string().regex(/^\d{6}$/, 'invalid_pin').optional());
export const locale = z.enum(['en', 'ta', 'hi', 'ml']);
