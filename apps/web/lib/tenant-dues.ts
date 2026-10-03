import 'server-only';
import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;

/** Open charges with what is still owed (approved payments only count). */
export async function openCharges(supabase: Client, tenancyId: string) {
  const { data } = await supabase
    .from('charges')
    .select('*, payment_allocations(amount_paise, payments(status))')
    .eq('tenancy_id', tenancyId)
    .in('status', ['pending', 'partially_paid', 'overdue'])
    .order('due_date');
  return (data ?? []).map((c) => {
    const paid = c.payment_allocations.filter((a) => a.payments?.status === 'approved').reduce((n, a) => n + a.amount_paise, 0);
    return { ...c, paid_paise: paid, outstanding_paise: c.amount_paise - paid };
  });
}
