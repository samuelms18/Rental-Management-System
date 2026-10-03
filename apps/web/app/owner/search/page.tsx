import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Empty, List, ListLink } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const { q = '' } = await searchParams;
  const query = q.trim().slice(0, 60);
  const { data } = query.length >= 2 ? await supabase.rpc('staff_search', { p_q: query }) : { data: [] };
  return (
    <>
      <PageHeader title={t('nav.search')} />
      <form className="mb-5">
        <input
          name="q"
          defaultValue={query}
          placeholder={t('common.searchPlaceholder')}
          autoFocus
          className="block min-h-12 w-full rounded-xl border border-border bg-surface px-4"
          type="search"
        />
      </form>
      {query.length >= 2 && (!data?.length ? (
        <Empty>{t('common.noResults')}</Empty>
      ) : (
        <List>
          {data.map((r) => (
            <ListLink key={`${r.kind}-${r.id}`} href={r.link} right={<Badge>{r.kind}</Badge>}>
              <div className="font-medium">{r.label}</div>
              <div className="text-xs text-muted">{r.sublabel}</div>
            </ListLink>
          ))}
        </List>
      ))}
    </>
  );
}
