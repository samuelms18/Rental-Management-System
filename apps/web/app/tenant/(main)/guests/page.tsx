import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, todayIST } from '@fpm/api';
import { DOC_TYPES } from '@fpm/validation';
import { Badge, toneFor } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Empty, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { PageHeader } from '@/components/ui/page-header';
import { IdNumberInput } from '@/components/id-number-input';
import { requireTenant } from '@/lib/auth';
import { checkoutGuest, registerGuest } from '@/lib/actions/people';

export default async function TenantGuests() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const { data } = await supabase.from('guests').select('*').eq('tenancy_id', tenancy.id).order('check_in', { ascending: false });
  return (
    <>
      <PageHeader title={t('guests.title')} subtitle={t('guests.rule')} />
      <div className="space-y-6">
        <Card>
          <ActionForm action={registerGuest} hidden={{ tenancy_id: tenancy.id }} resetOnSuccess>
            <h2 className="font-semibold">{t('guests.register')}</h2>
            <Field name="name" label={t('occupants.name')}><Input name="name" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field name="phone" label={t('occupants.phone')} optional><Input name="phone" type="tel" inputMode="tel" /></Field>
              <Field name="relationship" label={t('occupants.relationship')} optional><Input name="relationship" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field name="check_in" label={t('guests.checkIn')}><Input name="check_in" type="date" defaultValue={todayIST()} /></Field>
              <Field name="expected_checkout" label={t('guests.checkout')} optional><Input name="expected_checkout" type="date" /></Field>
            </div>
            <Field name="purpose" label={t('guests.purpose')} optional><Input name="purpose" /></Field>
            <Field name="doc_type" label={t('documents.type')}>
              <Select name="doc_type" options={DOC_TYPES.map((d) => ({ value: d, label: t(`labels.docType.${d}`) }))} />
            </Field>
            <Field name="number_last4" label={t('documents.number')} hint={t('documents.numberHint')} optional><IdNumberInput /></Field>
            <Field name="front" label={t('guests.idPhoto')}><FileInput name="front" accept="image/*,application/pdf" capture /></Field>
            <SubmitButton className="w-full sm:w-full">{t('guests.register')}</SubmitButton>
          </ActionForm>
        </Card>
        <Section title={t('guests.list')}>
          {!data?.length ? (
            <Empty>{t('guests.empty')}</Empty>
          ) : (
            <List>
              {data.map((g) => (
                <ListRow
                  key={g.id}
                  right={
                    g.status !== 'checked_out' ? (
                      <form action={checkoutGuest}><input type="hidden" name="id" value={g.id} /><Button size="sm" variant="secondary">{t('guests.checkOutNow')}</Button></form>
                    ) : <Badge tone={toneFor(g.status)}>{t(`status.guest.${g.status}`)}</Badge>
                  }
                >
                  <div className="font-medium">{g.name}</div>
                  <div className="text-xs text-muted">{formatDate(g.check_in, locale)}{g.expected_checkout && ` – ${formatDate(g.expected_checkout, locale)}`} · {t(`status.guest.${g.status}`)}</div>
                </ListRow>
              ))}
            </List>
          )}
        </Section>
      </div>
    </>
  );
}
