import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { locales } from '@fpm/i18n';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Card, DefList, List, ListLink, Section } from '@/components/ui/card';
import { ActionForm, Select, SubmitButton } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { resendInvite } from '@/lib/actions/tenancy';

export default async function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*, tenancies(id, code, status, start_date, houses(unit_number))')
    .eq('id', id)
    .maybeSingle();
  if (!tenant) notFound();
  const { data: consent } = await supabase.from('consents').select('accepted_at').eq('tenant_id', id).limit(1).maybeSingle();
  const hasLive = tenant.tenancies.some((x) => ['active', 'notice_period', 'pending_agreement', 'draft'].includes(x.status));

  return (
    <>
      <PageHeader
        title={tenant.full_name}
        subtitle={<Badge tone={toneFor(tenant.status)}>{t(`status.tenant.${tenant.status}`)}</Badge>}
        back="/owner/tenants"
        action={<LinkButton href={`/owner/tenants/${id}/edit`} variant="secondary" size="sm">{t('common.edit')}</LinkButton>}
      />
      <div className="space-y-8">
        <Card className="space-y-4">
          <DefList
            items={[
              [t('tenants.phone'), <a key="p" href={`tel:${tenant.phone}`} className="text-primary">{tenant.phone}</a>],
              [t('tenants.email'), tenant.email],
              [t('tenants.address'), tenant.permanent_address],
              [t('tenants.emergencyName'), [tenant.emergency_contact_name, tenant.emergency_contact_phone].filter(Boolean).join(' · ') || null],
              [t('consent.title'), consent ? formatDate(consent.accepted_at, locale) : '—'],
            ]}
          />
          <div className="flex items-center gap-2 text-sm">
            <Badge tone={tenant.user_id ? 'ok' : 'warn'}>{t(tenant.user_id ? 'tenants.accountLinked' : 'tenants.accountPending')}</Badge>
          </div>
          <ActionForm action={resendInvite} hidden={{ id }} className="flex flex-wrap items-end gap-2 space-y-0">
            <Select name="language" aria-label={t('tenants.language')} className="w-auto" options={locales.map((l) => ({ value: l, label: t(`languages.${l}`) }))} />
            <SubmitButton variant="secondary">{t(tenant.user_id ? 'tenants.resendInvite' : 'tenants.invite')}</SubmitButton>
          </ActionForm>
        </Card>
        <Section title={t('tenants.tenancies')} action={!hasLive && <LinkButton href={`/owner/tenancies/new?tenant=${id}`} size="sm">{t('tenants.newTenancy')}</LinkButton>}>
          <List>
            {tenant.tenancies.map((x) => (
              <ListLink key={x.id} href={`/owner/tenancies/${x.id}`} right={<Badge tone={toneFor(x.status)}>{t(`status.tenancy.${x.status}`)}</Badge>}>
                <div className="font-medium">{x.houses?.unit_number} · {x.code}</div>
                <div className="text-xs text-muted">{formatDate(x.start_date, locale)}</div>
              </ListLink>
            ))}
          </List>
        </Section>
      </div>
    </>
  );
}
