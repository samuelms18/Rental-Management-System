import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Daily maintenance that needs Storage access (the database can't delete files itself):
 * deletes identity-document files past their retention date, then their rows (an audit entry is kept).
 * Called by .github/workflows/daily.yml with the CRON_SECRET header.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();
  const { data: due, error } = await admin.rpc('documents_due_for_purge', {});
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rows = (due ?? []) as Array<{ id: string; front_path: string | null; back_path: string | null }>;
  const paths = rows.flatMap((r) => [r.front_path, r.back_path]).filter((p): p is string => !!p);
  for (let i = 0; i < paths.length; i += 100) {
    const { error: rmErr } = await admin.storage.from('identity-docs').remove(paths.slice(i, i + 100));
    if (rmErr) return NextResponse.json({ error: rmErr.message }, { status: 500 });
  }
  let purged = 0;
  if (rows.length) {
    const { data: n, error: pErr } = await admin.rpc('purge_documents', { p_ids: rows.map((r) => r.id) });
    if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
    purged = n ?? 0;
  }
  return NextResponse.json({ purged_documents: purged, deleted_files: paths.length });
}
