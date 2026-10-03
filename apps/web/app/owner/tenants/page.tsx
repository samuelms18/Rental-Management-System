import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Empty, List, ListLink } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/components/ui/cn';
import { requireStaff } from '@/lib/auth';

export default async function TenantsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const { supabase } = await requireStaff();
  const { show = 'active' } = await searchParams;
  const t = await getTranslations();
  const { data } = await supabase
    .from('tenants')
    .select('id, full_name, phone, status, user_id, tenancies(code, status, houses(unit_number))')
    .eq('status', show === 'former' ? 'former' : 'active')
    .order('full_name');
  return (
    <>
      <PageHeader title={t('tenants.title')} action={<LinkButton href="/owner/tenants/new" size="sm"><Plus className="size-4" />{t('common.add')}</LinkButton>} />
      <div className="mb-4 flex gap-2">
        {(['active', 'former'] as const).map((s) => (
          <Link key={s} href={`?show=${s}`} className={cn('min-h-10 rounded-full border px-4 py-2 text-sm', show === s ? 'border-primary bg-primary-soft text-primary' : 'border-border')}>
            {t(s === 'active' ? 'tenants.current' : 'tenants.former')}
          </Link>
        ))}
      </div>
      {!data?.length ? (
        <Empty>{t('tenants.empty')}</Empty>
      ) : (
        <List>
          {data.map((x) => {
            const live = x.tenancies.find((ty) => ['active', 'notice_period', 'pending_agreement', 'draft'].includes(ty.status));
            return (
              <ListLink key={x.id} href={`/owner/tenants/${x.id}`} right={live && <Badge tone={toneFor(live.status)}>{live.houses?.unit_number}</Badge>}>
                <div className="font-medium">{x.full_name}</div>
                <div className="text-xs text-muted">{x.phone}</div>
              </ListLink>
            );
          })}
        </List>
      )}
    </>
  );
}
