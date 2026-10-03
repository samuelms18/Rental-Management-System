/** ID numbers: the client keeps only the last 4 characters; the full number never leaves the device. */
export function lastFour(raw: string): string | null {
  const cleaned = raw.replace(/[^0-9A-Za-z]/g, '');
  return cleaned.length >= 4 ? cleaned.slice(-4).toUpperCase() : null;
}

/** Display a masked ID like XXXX-XXXX-1234. */
export function maskedId(last4: string | null | undefined): string {
  return last4 ? `XXXX-XXXX-${last4}` : '—';
}
