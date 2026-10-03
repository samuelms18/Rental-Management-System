import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Empty, List, ListLink } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/components/ui/cn';
import { requireStaff } from '@/lib/auth';

const FILTERS = {
  open: ['raised', 'acknowledged'],
  progress: ['assigned', 'in_progress'],
  done: ['resolved', 'tenant_confirmed', 'closed'],
} as const;

export default async function OwnerComplaints({ searchParams }: { searchParams: Promise<{ f?: keyof typeof FILTERS }> }) {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { f = 'open' } = await searchParams;
  const statuses = FILTERS[f] ?? FILTERS.open;
  const { data } = await supabase
    .from('complaints')
    .select('id, code, title, priority, status, created_at, tenancies(houses(unit_number), tenants(full_name))')
    .in('status', [...statuses])
    .order('created_at', { ascending: false });
  const labels = { open: 'complaints.filterOpen', progress: 'complaints.filterInProgress', done: 'complaints.filterResolved' } as const;
  return (
    <>
      <PageHeader title={t('complaints.title')} />
      <div className="mb-4 flex flex-wrap gap-2">
        {(Object.keys(FILTERS) as Array<keyof typeof FILTERS>).map((k) => (
          <Link key={k} href={`?f=${k}`} className={cn('min-h-10 rounded-full border px-4 py-2 text-sm', f === k ? 'border-primary bg-primary-soft text-primary' : 'border-border')}>
            {t(labels[k])}
          </Link>
        ))}
      </div>
      {!data?.length ? (
        <Empty>{t('complaints.empty')}</Empty>
      ) : (
        <List>
          {data.map((c) => (
            <ListLink key={c.id} href={`/owner/complaints/${c.id}`} right={<><Badge tone={toneFor(c.status)}>{t(`status.complaint.${c.status}`)}</Badge>{c.priority === 'urgent' && <div className="mt-1"><Badge tone="danger">{t('labels.priority.urgent')}</Badge></div>}</>}>
              <div className="font-medium">{c.tenancies?.houses?.unit_number} · {c.title}</div>
              <div className="text-xs text-muted">{c.code} · {c.tenancies?.tenants?.full_name} · {formatDate(c.created_at, locale)}</div>
            </ListLink>
          ))}
        </List>
      )}
    </>
  );
}
