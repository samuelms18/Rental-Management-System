import { getTranslations } from 'next-intl/server';
import { Empty, List, ListRow } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ table?: string; page?: string }> }) {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const { table, page } = await searchParams;
  const pageNo = Math.max(0, Number(page ?? 0) || 0);
  let q = supabase
    .from('activity_logs')
    .select('id, action, table_name, record_id, created_at, actor_id, profiles(full_name)')
    .order('created_at', { ascending: false })
    .range(pageNo * 50, pageNo * 50 + 49);
  if (table) q = q.eq('table_name', table);
  const { data } = await q;
  const fmt = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' });

  return (
    <>
      <PageHeader title={t('activity.title')} />
      {!data?.length ? (
        <Empty>{t('activity.empty')}</Empty>
      ) : (
        <List>
          {data.map((a) => (
            <ListRow key={a.id} right={<span className="text-xs text-muted">{fmt.format(new Date(a.created_at))}</span>}>
              <div className="text-sm">
                <span className="font-medium">{a.profiles?.full_name || t('activity.system')}</span> · {a.action} · {a.table_name}
              </div>
              <div className="truncate font-mono text-xs text-muted">{a.record_id}</div>
            </ListRow>
          ))}
        </List>
      )}
      <div className="mt-4 flex justify-between text-sm">
        {pageNo > 0 ? <a className="text-primary" href={`?page=${pageNo - 1}${table ? `&table=${table}` : ''}`}>←</a> : <span />}
        {data?.length === 50 && <a className="text-primary" href={`?page=${pageNo + 1}${table ? `&table=${table}` : ''}`}>→</a>}
      </div>
    </>
  );
}
