import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderAgreementPdf } from '@/lib/agreement-pdf';

/** Current version as PDF, with the tenant's drawn signature added when signed. Access via the caller's RLS. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: a } = await supabase.from('agreements').select('id, current_version_id, tenancies(tenants(full_name))').eq('id', id).maybeSingle();
  if (!a?.current_version_id) return new NextResponse('Not found', { status: 404 });
  const [{ data: v }, { data: sig }] = await Promise.all([
    supabase.from('agreement_versions').select('*').eq('id', a.current_version_id).single(),
    supabase.from('signatures').select('*').eq('agreement_version_id', a.current_version_id).eq('signer_role', 'tenant').eq('method', 'drawn').order('signed_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!v) return new NextResponse('Not found', { status: 404 });
  let signature = null;
  if (sig) {
    const { data: blob } = await createAdminClient().storage.from('agreements').download(sig.image_path);
    if (blob) signature = { png: new Uint8Array(await blob.arrayBuffer()), signedAt: sig.signed_at, name: a.tenancies?.tenants?.full_name ?? '' };
  }
  const bytes = await renderAgreementPdf({ body: v.body_text, versionNo: v.version_no, signature });
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="agreement-v${v.version_no}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
