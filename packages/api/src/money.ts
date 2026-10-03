/** Money is stored as integer paise. These helpers convert and format; never use floats for storage. */

/** "12,500.50" / "12500" / "₹ 12,500" → 1250050 paise. Returns null for invalid input. */
export function rupeesToPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  const s = String(input).replace(/[₹,\s]/g, '').replace(/^Rs\.?/i, '');
  if (s === '') return null;
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ''] = s.split('.');
  return Number(whole) * 100 + Number((frac + '00').slice(0, 2));
}

/** 1250050 → "12500.50" (for form inputs). */
export function paiseToRupeesInput(paise: number | null | undefined): string {
  if (paise === null || paise === undefined) return '';
  const whole = Math.floor(paise / 100);
  const frac = paise % 100;
  return frac === 0 ? String(whole) : `${whole}.${String(frac).padStart(2, '0')}`;
}

/** Display amount in Indian format, e.g. ₹12,500 or ₹12,500.50 (en-IN digits for every UI language). */
export function formatINR(paise: number | null | undefined): string {
  const v = (paise ?? 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: v % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(v);
}

/** Plain-ASCII amount for PDFs whose standard fonts lack the ₹ glyph: "Rs. 12,500". */
export function formatINRAscii(paise: number): string {
  return formatINR(paise).replace('₹', 'Rs. ');
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
  'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n] ?? '';
  const t = TENS[Math.floor(n / 10)] ?? '';
  const o = ONES[n % 10] ?? '';
  return o ? `${t} ${o}` : t;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (h) parts.push(`${ONES[h]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/** Indian numbering in words: 1250050 paise → "Rupees Twelve Thousand Five Hundred and Fifty Paise Only". */
export function amountInWordsINR(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const p = paise % 100;
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  const parts: string[] = [];
  if (crore) parts.push(`${crore >= 100 ? threeDigits(crore) : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rest) parts.push(threeDigits(rest));
  let words = parts.length ? `Rupees ${parts.join(' ')}` : 'Rupees Zero';
  if (p) words += ` and ${twoDigits(p)} Paise`;
  return `${words} Only`;
}
