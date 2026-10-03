import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { addDays, paiseToRupeesInput, todayIST } from '@fpm/api';
import { Card } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { createAgreement } from '@/lib/actions/agreements';

export default async function NewAgreement({ searchParams }: { searchParams: Promise<{ tenancy?: string; renew?: string }> }) {
  const { tenancy: tenancyId, renew } = await searchParams;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const { data: ty } = await supabase.from('tenancies').select('id, code, start_date, advance_paise, houses(unit_number), tenants(full_name)').eq('id', tenancyId ?? '').maybeSingle();
  if (!ty) notFound();
  const [{ data: templates }, { data: rent }, { data: previous }] = await Promise.all([
    supabase.from('agreement_templates').select('id, name, reviewed_by_note').eq('is_active', true).order('created_at'),
    supabase.rpc('rent_for', { p_tenancy_id: ty.id, p_on: todayIST() }),
    renew ? supabase.from('agreements').select('end_date, rent_paise, advance_paise').eq('id', renew).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const start = previous ? addDays(previous.end_date, 1) : ty.start_date > todayIST() ? ty.start_date : todayIST();
  const end = addDays(start, 334); // about 11 months: under the 12 months that need registration
  const note = templates?.[0]?.reviewed_by_note;
  return (
    <>
      <PageHeader title={renew ? t('agreements.renew') : t('agreements.new')} subtitle={`${ty.houses?.unit_number} · ${ty.tenants?.full_name}`} back={`/owner/tenancies/${ty.id}`} />
      {note && <p className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn">{note}</p>}
      <Card>
        <ActionForm action={createAgreement} hidden={{ tenancy_id: ty.id, renewal_of: renew }}>
          <Field name="template_id" label={t('agreements.template')}>
            <Select name="template_id" options={(templates ?? []).map((x) => ({ value: x.id, label: x.name }))} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field name="start_date" label={t('tenancy.startDate')}><Input name="start_date" type="date" defaultValue={start} /></Field>
            <Field name="end_date" label={t('tenancy.endDate')} hint={t('agreements.elevenMonths')}><Input name="end_date" type="date" defaultValue={end} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="rent_paise" label={t('tenancy.rent')}>
              <MoneyInput name="rent_paise" defaultValue={paiseToRupeesInput(previous?.rent_paise ?? rent ?? null)} />
            </Field>
            <Field name="advance_paise" label={t('tenancy.advance')}>
              <MoneyInput name="advance_paise" defaultValue={paiseToRupeesInput(previous?.advance_paise ?? ty.advance_paise)} />
            </Field>
          </div>
          <SubmitButton>{t('agreements.create')}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
