import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Empty, List, ListRow, Section } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { fileUrl } from '@/lib/file-url';

export default async function OwnerGuests() {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ data: guests }, { data: docs }] = await Promise.all([
    supabase.from('guests').select('*, tenancies(houses(unit_number), tenants(full_name))').order('check_in', { ascending: false }).limit(100),
    supabase.from('identity_documents').select('owner_id, front_path, doc_type').eq('owner_type', 'guest'),
  ]);
  const current = (guests ?? []).filter((g) => g.status !== 'checked_out');
  const past = (guests ?? []).filter((g) => g.status === 'checked_out');
  const row = (g: NonNullable<typeof guests>[number]) => {
    const doc = docs?.find((d) => d.owner_id === g.id);
    return (
      <ListRow key={g.id} right={<Badge tone={toneFor(g.status)}>{t(`status.guest.${g.status}`)}</Badge>}>
        <div className="font-medium">{g.tenancies?.houses?.unit_number} · {g.name}</div>
        <div className="text-xs text-muted">{g.tenancies?.tenants?.full_name} · {formatDate(g.check_in, locale)}{g.expected_checkout && ` – ${formatDate(g.expected_checkout, locale)}`}{g.relationship && ` · ${g.relationship}`}</div>
        {doc?.front_path && <a className="text-xs text-primary" href={fileUrl('identity-docs', doc.front_path)!} target="_blank" rel="noreferrer">{t(`labels.docType.${doc.doc_type}`)}</a>}
      </ListRow>
    );
  };
  return (
    <>
      <PageHeader title={t('guests.log')} />
      <div className="space-y-6">
        <Section title={t('guests.current')}>{current.length ? <List>{current.map(row)}</List> : <Empty>{t('guests.empty')}</Empty>}</Section>
        {past.length > 0 && <Section title={t('guests.past')}><List>{past.map(row)}</List></Section>}
      </div>
    </>
  );
}
