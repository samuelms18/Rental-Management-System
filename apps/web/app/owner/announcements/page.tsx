import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Card, Empty, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { postAnnouncement } from '@/lib/actions/people';

export default async function OwnerAnnouncements() {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ data: list }, { data: properties }, { data: houses }, { data: tenants }] = await Promise.all([
    supabase.from('announcements').select('*, announcement_reads(user_id)').order('created_at', { ascending: false }).limit(50),
    supabase.from('properties').select('id, name').order('name'),
    supabase.from('houses').select('id, unit_number, status').eq('status', 'occupied').order('unit_number'),
    supabase.from('tenants').select('id, full_name').eq('status', 'active').order('full_name'),
  ]);
  const options = [
    { value: 'all', label: t('announcements.allTenants') },
    ...(properties ?? []).map((p) => ({ value: `property:${p.id}`, label: `${t('expenses.property')}: ${p.name}` })),
    ...(houses ?? []).map((h) => ({ value: `house:${h.id}`, label: `${t('expenses.house')}: ${h.unit_number}` })),
    ...(tenants ?? []).map((x) => ({ value: `tenant:${x.id}`, label: `${t('tenancy.tenant')}: ${x.full_name}` })),
  ];
  return (
    <>
      <PageHeader title={t('announcements.title')} />
      <div className="space-y-6">
        <Card>
          <ActionForm action={postAnnouncement} resetOnSuccess>
            <Field name="target" label={t('announcements.to')}><Select name="target" options={options} /></Field>
            <Field name="title" label={t('complaints.titleLabel')}><Input name="title" /></Field>
            <Field name="body" label={t('announcements.message')}><Textarea name="body" rows={4} /></Field>
            <SubmitButton>{t('announcements.post')}</SubmitButton>
          </ActionForm>
        </Card>
        <Section title={t('announcements.sent')}>
          {!list?.length ? <Empty>{t('announcements.empty')}</Empty> : (
            <List>
              {list.map((a) => (
                <ListRow key={a.id} right={<span className="text-xs text-muted">{t('announcements.readBy', { count: a.announcement_reads.length })}</span>}>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted">{formatDate(a.created_at, locale)} · {t(`announcements.targets.${a.target}`)}</div>
                </ListRow>
              ))}
            </List>
          )}
        </Section>
      </div>
    </>
  );
}
