import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, Empty, List, ListLink, ListRow, Section } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { savePayee, saveReminderRules } from '@/lib/actions/properties';
import { fileUrl } from '@/lib/file-url';

export default async function PropertyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const { data: property } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
  if (!property) notFound();
  const [{ data: houses }, { data: payee }, { data: rules }, { data: team }] = await Promise.all([
    supabase.from('houses').select('id, unit_number, unit_type, status, default_rent_paise').eq('property_id', id).order('unit_number'),
    supabase.from('payee_settings').select('*').eq('property_id', id).maybeSingle(),
    supabase.from('reminder_rules').select('*').eq('property_id', id).maybeSingle(),
    supabase.from('property_members').select('role, profiles(full_name, email)').eq('property_id', id),
  ]);
  const qr = fileUrl('payee', payee?.qr_path);

  return (
    <>
      <PageHeader
        title={property.name}
        subtitle={[property.address_line, property.city, property.pin].filter(Boolean).join(', ')}
        back="/owner/properties"
        action={<LinkButton href={`/owner/properties/${id}/edit`} variant="secondary" size="sm">{t('common.edit')}</LinkButton>}
      />
      <div className="space-y-8">
        <Section
          title={t('properties.houses')}
          action={<LinkButton href={`/owner/houses/new?property=${id}`} size="sm"><Plus className="size-4" />{t('properties.addHouse')}</LinkButton>}
        >
          {!houses?.length ? (
            <Empty>{t('properties.noHouses')}</Empty>
          ) : (
            <List>
              {houses.map((h) => (
                <ListLink key={h.id} href={`/owner/houses/${h.id}`} right={<Badge tone={toneFor(h.status)}>{t(`status.house.${h.status}`)}</Badge>}>
                  <div className="font-medium">{h.unit_number}</div>
                  <div className="text-xs text-muted">{h.unit_type ?? ''} {h.default_rent_paise ? <>· <Money paise={h.default_rent_paise} /></> : null}</div>
                </ListLink>
              ))}
            </List>
          )}
        </Section>

        <Section title={t('payee.title')}>
          <Card className="space-y-4">
            <p className="text-sm text-muted">{t('payee.help')}</p>
            {qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt={t('payee.qr')} className="size-40 rounded-xl border border-border bg-white object-contain p-1" />
            )}
            <ActionForm action={savePayee} hidden={{ property_id: id }}>
              <Field name="payee_name" label={t('payee.name')}>
                <Input name="payee_name" defaultValue={payee?.payee_name ?? ''} />
              </Field>
              <Field name="upi_id" label={t('payee.upiId')}>
                <Input name="upi_id" defaultValue={payee?.upi_id ?? ''} autoCapitalize="off" autoCorrect="off" placeholder="name@okaxis" />
              </Field>
              <Field name="qr" label={t('payee.qr')} optional={!!payee?.qr_path}>
                <FileInput name="qr" />
              </Field>
              <SubmitButton>{t('common.save')}</SubmitButton>
            </ActionForm>
          </Card>
        </Section>

        {rules && (
          <Section title={t('reminders.rules')}>
            <Card>
              <ActionForm action={saveReminderRules} hidden={{ property_id: id }}>
                <Field name="offsets" label={t('reminders.offsets')}>
                  <Input name="offsets" defaultValue={rules.offsets.filter((o) => o < 0).map((o) => Math.abs(o)).join(', ')} inputMode="numeric" />
                </Field>
                <Field name="overdue_every_days" label={t('reminders.overdueEvery')}>
                  <Input name="overdue_every_days" type="number" min={1} max={30} defaultValue={rules.overdue_every_days} />
                </Field>
                <p className="text-xs text-muted">{t('reminders.quiet')}</p>
                <SubmitButton>{t('common.save')}</SubmitButton>
              </ActionForm>
            </Card>
          </Section>
        )}

        <Section title={t('properties.team')}>
          <List>
            {(team ?? []).map((m, i) => (
              <ListRow key={i} right={<Badge tone={m.role === 'owner' ? 'primary' : 'neutral'}>{t(`profile.roles.${m.role}`)}</Badge>}>
                <div className="font-medium">{m.profiles?.full_name}</div>
                <div className="text-xs text-muted">{m.profiles?.email}</div>
              </ListRow>
            ))}
          </List>
        </Section>
      </div>
    </>
  );
}
