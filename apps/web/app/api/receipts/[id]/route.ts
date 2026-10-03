import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderReceiptPdf } from '@/lib/receipt-pdf';

const METHOD: Record<string, string> = { upi: 'UPI', cash: 'Cash', bank_transfer: 'Bank transfer', other: 'Other' };
const TYPE: Record<string, string> = { rent: 'Rent', eb: 'EB bill', eb_reimbursement: 'EB reimbursement', water: 'Water', maintenance: 'Maintenance', other: 'Other' };

/** Receipt PDF: generated on first download, stored privately, then served via a 5-minute signed URL. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  // RLS: staff of the property or the tenant themselves.
  const { data: receipt } = await supabase
    .from('receipts')
    .select('*, payments(*, payment_allocations(amount_paise, charges(type, period_start)), tenancies(code, tenants(full_name), houses(unit_number, property_id, properties(name, address_line, city))))')
    .eq('id', id)
    .maybeSingle();
  if (!receipt || !receipt.payments) return new NextResponse('Not found', { status: 404 });

  const admin = createAdminClient();
  let path = receipt.pdf_path;
  if (!path || receipt.cancelled_at) {
    const p = receipt.payments;
    const house = p.tenancies?.houses;
    const { data: payee } = await admin.from('payee_settings').select('payee_name').eq('property_id', house?.property_id ?? '').maybeSingle();
    const towards = p.payment_allocations
      .map((a) => `${TYPE[a.charges?.type ?? 'other']} ${a.charges?.period_start.slice(0, 7) ?? ''}`.trim())
      .join(', ') || 'Advance / credit';
    const bytes = await renderReceiptPdf({
      number: receipt.number,
      issuedAt: receipt.issued_at,
      cancelled: !!receipt.cancelled_at,
      tenantName: p.tenancies?.tenants?.full_name ?? '',
      house: house?.unit_number ?? '',
      property: house?.properties?.name ?? '',
      propertyAddress: [house?.properties?.address_line, house?.properties?.city].filter(Boolean).join(', '),
      towards,
      amountPaise: p.amount_paise,
      method: METHOD[p.method] ?? p.method,
      reference: p.utr_reference,
      paidOn: p.paid_on,
      receivedBy: p.received_by,
      ownerName: payee?.payee_name ?? 'Owner',
    });
    if (receipt.cancelled_at) {
      return new NextResponse(Buffer.from(bytes), {
        headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${receipt.number}.pdf"`, 'Cache-Control': 'private, no-store' },
      });
    }
    path = `${p.tenancy_id}/${receipt.number}.pdf`;
    const { error } = await admin.storage.from('receipts').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
    if (error) return new NextResponse('Error', { status: 500 });
    await supabase.rpc('set_receipt_pdf', { p_receipt_id: receipt.id, p_path: path });
  }
  const { data: signed } = await admin.storage.from('receipts').createSignedUrl(path, 300);
  if (!signed) return new NextResponse('Not found', { status: 404 });
  return NextResponse.redirect(signed.signedUrl);
}
