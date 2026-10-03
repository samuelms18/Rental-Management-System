/** All business dates are India time (Asia/Kolkata). Dates are ISO strings "YYYY-MM-DD". */

export function todayIST(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

export function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / 86_400_000);
}

export function monthStart(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

/** Display a date in the user's language, e.g. "5 Oct 2026". */
export function formatDate(iso: string | null | undefined, locale = 'en'): string {
  if (!iso) return '';
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00+05:30` : iso);
  return new Intl.DateTimeFormat(`${locale}-IN`, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(d);
}

/** "October 2026" style month label. */
export function formatMonth(iso: string, locale = 'en'): string {
  return new Intl.DateTimeFormat(`${locale}-IN`, { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(
    new Date(`${iso.slice(0, 7)}-01T00:00:00+05:30`),
  );
}

/** Quiet hours 21:00–08:00 IST: no automatic messages. */
export function isQuietHours(now: Date = new Date()): boolean {
  const h = Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' }).format(now),
  );
  return h >= 21 || h < 8;
}
