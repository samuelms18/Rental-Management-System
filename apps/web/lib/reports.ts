import 'server-only';
import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;
export type ReportFilters = { from: string; to: string; property?: string; house?: string };

export function readFilters(sp: Record<string, string | undefined>, today: string): ReportFilters {
  const valid = (d?: string) => (d && /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : undefined);
  const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/.test(v) ? v : undefined);
  return {
    from: valid(sp.from) ?? `${today.slice(0, 4)}-01-01`,
    to: valid(sp.to) ?? today,
    property: uuid(sp.property),
    house: uuid(sp.house),
  };
}

export async function loadReports(supabase: Client, f: ReportFilters) {
  const args = { p_from: f.from, p_to: f.to, p_property_id: f.property, p_house_id: f.house };
  const [rent, eb, expenses, deposits, net] = await Promise.all([
    supabase.rpc('report_rent', args),
    supabase.rpc('report_eb', args),
    supabase.rpc('report_expenses', args),
    supabase.rpc('report_deposits', { p_property_id: f.property, p_house_id: f.house }),
    supabase.rpc('report_net_income', args),
  ]);
  return {
    rent: rent.data ?? [],
    eb: eb.data ?? [],
    expenses: expenses.data ?? [],
    deposits: deposits.data ?? [],
    net: net.data ?? [],
  };
}

/** CSV with a UTF-8 BOM so Excel shows Tamil/Hindi/Malayalam names correctly. Amounts in rupees. */
export function toCsv(header: string[], rows: Array<Array<string | number | null>>): string {
  const esc = (v: string | number | null) => {
    const s = v === null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n') + '\r\n';
}

export const rupees = (paise: number) => (paise / 100).toFixed(2);
