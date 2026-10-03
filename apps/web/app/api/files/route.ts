import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Bucket } from '@/lib/files';

// Which table/column references files in each bucket. A user may open a file only if their own
// RLS-limited client can read a row pointing at it.
const OWNERS: Record<Bucket, Array<{ table: string; column: string }>> = {
  'house-photos': [{ table: 'house_photos', column: 'storage_path' }],
  'tenant-photos': [
    { table: 'tenants', column: 'photo_path' },
    { table: 'occupants', column: 'photo_path' },
  ],
  'identity-docs': [
    { table: 'identity_documents', column: 'front_path' },
    { table: 'identity_documents', column: 'back_path' },
  ],
  agreements: [{ table: 'tenancies', column: 'offline_agreement_path' }],
  payee: [{ table: 'payee_settings', column: 'qr_path' }],
  'payment-proofs': [
    { table: 'payments', column: 'proof_path' },
    { table: 'eb_bills', column: 'proof_path' },
  ],
  receipts: [{ table: 'receipts', column: 'pdf_path' }],
  'complaint-media': [{ table: 'complaint_media', column: 'path' }],
  'expense-receipts': [{ table: 'expenses', column: 'receipt_path' }],
};

const SIGNED_URL_SECONDS = 300;

export async function GET(request: NextRequest) {
  const bucket = request.nextUrl.searchParams.get('b') as Bucket | null;
  const path = request.nextUrl.searchParams.get('p');
  const download = request.nextUrl.searchParams.get('download') === '1';
  if (!bucket || !path || !(bucket in OWNERS)) return new NextResponse('Not found', { status: 404 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse('Unauthorized', { status: 401 });

  let allowedRow: Record<string, unknown> | null = null;
  for (const { table, column } of OWNERS[bucket]) {
    const { data } = await (supabase.from(table as any) as any).select('*').eq(column, path).limit(1).maybeSingle();
    if (data) {
      allowedRow = data;
      break;
    }
  }
  if (!allowedRow) return new NextResponse('Not found', { status: 404 });

  // Identity documents: every view is in the audit log.
  if (bucket === 'identity-docs') {
    const { data: propertyId } = await supabase.rpc('tenancy_property_id', {
      p_tenancy_id: String(allowedRow.tenancy_id),
    });
    await supabase.rpc('log_action', {
      p_action: download ? 'download' : 'view',
      p_table: 'identity_documents',
      p_record_id: String(allowedRow.id),
      p_property_id: propertyId ?? undefined,
      p_details: { path },
    });
  }

  const { data: signed, error } = await createAdminClient()
    .storage.from(bucket)
    .createSignedUrl(path, SIGNED_URL_SECONDS, download ? { download: true } : undefined);
  if (error || !signed) return new NextResponse('Not found', { status: 404 });

  const res = NextResponse.redirect(signed.signedUrl);
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}
