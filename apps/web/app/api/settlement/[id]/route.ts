import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderSettlementPdf } from '@/lib/settlement-pdf';
import { settlementLines } from '@/lib/settlement';

const LABELS: Record<string, string> = { received: 'Advance received', offset_rent: 'Unpaid rent', offset_eb: 'Unpaid electricity' };

/** Settlement statement PDF for a tenancy (staff, the tenant, or the former tenant within 90 days — via RLS). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: mo } = await supabase.from('move_out_records').select('*').eq('tenancy_id', id).maybeSingle();
  if (!mo) return new NextResponse('Not found', { status: 404 });
  const { data: ty } = await supabase.rpc('settlement_header', { p_tenancy_id: id });
  const h = (ty as Array<{ tenant_name: string; unit_number: string; property_name: string; code: string; payee_name: string | null }> | null)?.[0];
  const { lines, balance, refunded } = await settlementLines(supabase, id);
  const bytes = await renderSettlementPdf({
    tenantName: h?.tenant_name ?? '',
    house: h?.unit_number ?? '',
    property: h?.property_name ?? '',
    code: h?.code ?? '',
    moveOutDate: mo.move_out_date,
    ownerName: h?.payee_name ?? 'Owner',
    lines: lines.map((l) => ({ label: l.type === 'deduction' ? `Deduction: ${l.label}` : LABELS[l.type] ?? l.label, amount: l.amount, sign: l.sign })),
    refund: mo.status === 'settled' ? refunded : Math.max(balance, 0),
    status: mo.status,
    refundDate: mo.refund_date,
    refundMethod: mo.refund_method,
    refundReference: mo.refund_reference,
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="settlement.pdf"', 'Cache-Control': 'private, no-store' },
  });
}
