import 'server-only';
import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;
export type Line = { label: string; labelKey?: string; amount: number; sign: 1 | -1; id?: string; type: string; photo?: string | null };

/** Deposit ledger rows → statement lines (received +, deductions/offsets −). Refund rows are summarised separately. */
export async function settlementLines(supabase: Client, tenancyId: string) {
  const { data } = await supabase.from('deposit_transactions').select('*').eq('tenancy_id', tenancyId).order('created_at');
  const rows = data ?? [];
  const lines: Line[] = rows
    .filter((r) => r.type !== 'refund')
    .map((r) => ({
      id: r.id,
      type: r.type,
      photo: r.photo_path,
      amount: r.amount_paise,
      sign: r.type === 'received' ? 1 : -1,
      label: r.reason ?? r.type,
      labelKey: r.type === 'received' ? 'moveOut.advanceReceived' : r.type === 'offset_rent' ? 'moveOut.unpaidRent' : r.type === 'offset_eb' ? 'moveOut.unpaidEb' : undefined,
    }));
  const balance = lines.reduce((n, l) => n + l.sign * l.amount, 0);
  const refunded = rows.filter((r) => r.type === 'refund').reduce((n, r) => n + r.amount_paise, 0);
  return { lines, balance, refunded };
}
