import { NextResponse, type NextRequest } from 'next/server';
import { formatINR, todayIST } from '@fpm/api';
import { createClient } from '@/lib/supabase/server';
import { loadReports, readFilters, rupees, toCsv } from '@/lib/reports';
import { PdfWriter } from '@/lib/pdf-text';

/** CSV exports (UTF-8 with BOM) and a summary PDF. Staff only — the report functions run with the caller's RLS. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  const supabase = await createClient();
  const { data: isStaff } = await supabase.rpc('is_staff');
  if (!isStaff) return new NextResponse('Forbidden', { status: 403 });
  const f = readFilters(Object.fromEntries(request.nextUrl.searchParams), todayIST());
  const r = await loadReports(supabase, f);
  const name = `fpm-${kind}-${f.from}-to-${f.to}`;

  let csv: string | null = null;
  switch (kind) {
    case 'rent':
      csv = toCsv(['Month', 'House', 'Property', 'Expected (Rs)', 'Collected (Rs)', 'Pending (Rs)', 'Overdue (Rs)'],
        r.rent.map((x) => [x.month.slice(0, 7), x.unit_number, x.property_name, rupees(x.expected_paise), rupees(x.collected_paise), rupees(x.pending_paise), rupees(x.overdue_paise)]));
      break;
    case 'eb':
      csv = toCsv(['House', 'Billed (Rs)', 'Paid by tenant (Rs)', 'Paid by owner (Rs)', 'Reimbursed (Rs)', 'Outstanding (Rs)'],
        r.eb.map((x) => [x.unit_number, rupees(x.billed_paise), rupees(x.paid_by_tenant_paise), rupees(x.paid_by_owner_paise), rupees(x.reimbursed_paise), rupees(x.outstanding_paise)]));
      break;
    case 'expenses':
      csv = toCsv(['Category', 'House', 'Items', 'Total (Rs)'], r.expenses.map((x) => [x.category, x.unit_number || 'Whole property', x.items, rupees(x.total_paise)]));
      break;
    case 'deposits':
      csv = toCsv(['Tenancy', 'House', 'Tenant', 'Status', 'Received (Rs)', 'Deductions (Rs)', 'Offsets (Rs)', 'Refunded (Rs)', 'Held (Rs)'],
        r.deposits.map((x) => [x.code, x.unit_number, x.tenant_name, x.status, rupees(x.received_paise), rupees(x.deductions_paise), rupees(x.offsets_paise), rupees(x.refunded_paise), rupees(x.held_paise)]));
      break;
    case 'net':
      csv = toCsv(['House', 'Rent collected (Rs)', 'Expenses (Rs)', 'Net (Rs)'], r.net.map((x) => [x.unit_number, rupees(x.rent_collected_paise), rupees(x.expenses_paise), rupees(x.net_paise)]));
      break;
    case 'pdf': {
      const w = await PdfWriter.create('Report');
      const sum = (rows: Array<Record<string, unknown>>, k: string) => rows.reduce((n, x) => n + Number(x[k] ?? 0), 0);
      w.text('FAMILY PROPERTY REPORT', { size: 18, bold: true, gap: 4 });
      w.text(`${f.from} to ${f.to}`, { gap: 14 });
      w.text('Rent', { size: 13, bold: true });
      w.text(`Expected ${formatINR(sum(r.rent, 'expected_paise'))} · Collected ${formatINR(sum(r.rent, 'collected_paise'))} · Pending ${formatINR(sum(r.rent, 'pending_paise'))} · Overdue ${formatINR(sum(r.rent, 'overdue_paise'))}`, { gap: 12 });
      w.text('Net income per house', { size: 13, bold: true });
      for (const x of r.net) w.text(`${x.unit_number}: rent ${formatINR(x.rent_collected_paise)} − expenses ${formatINR(x.expenses_paise)} = **${formatINR(x.net_paise)}**`, { gap: 2 });
      w.y -= 10;
      w.text('Electricity', { size: 13, bold: true });
      for (const x of r.eb) w.text(`${x.unit_number}: billed ${formatINR(x.billed_paise)}, outstanding ${formatINR(x.outstanding_paise)}`, { gap: 2 });
      w.y -= 10;
      w.text('Expenses by category', { size: 13, bold: true });
      for (const x of r.expenses) w.text(`${x.category}${x.unit_number ? ` (${x.unit_number})` : ''}: ${formatINR(x.total_paise)}`, { gap: 2 });
      w.y -= 10;
      w.text('Deposits held', { size: 13, bold: true });
      w.text(formatINR(sum(r.deposits, 'held_paise')));
      w.footer('Rent is reported by the month it is for; collected = approved payments applied to it.');
      return new NextResponse(Buffer.from(await w.doc.save()), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${name}.pdf"`, 'Cache-Control': 'private, no-store' },
      });
    }
  }
  if (csv === null) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"`, 'Cache-Control': 'private, no-store' },
  });
}
