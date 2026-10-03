import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { paiseToRupeesInput, todayIST } from '@fpm/api';
import { Card } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { createTenancy } from '@/lib/actions/tenancy';

export default async function NewTenancy({ searchParams }: { searchParams: Promise<{ house?: string; tenant?: string }> }) {
  const { house: houseId, tenant: tenantId } = await searchParams;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const [{ data: houses }, { data: tenants }] = await Promise.all([
    supabase.from('houses').select('id, unit_number, status, default_rent_paise, default_advance_paise, properties(name)').neq('status', 'occupied').order('unit_number'),
    supabase.from('tenants').select('id, full_name, phone, tenancies(status)').eq('status', 'active').order('full_name'),
  ]);
  const freeTenants = (tenants ?? []).filter((x) => !x.tenancies.some((ty) => ['active', 'notice_period', 'pending_agreement', 'draft'].includes(ty.status)));
  const selected = houses?.find((h) => h.id === houseId);
  const back = houseId ? `/owner/houses/${houseId}` : '/owner/tenants';
  const here = `/owner/tenancies/new${houseId ? `?house=${houseId}` : ''}`;

  return (
    <>
      <PageHeader title={t('tenancy.new')} back={back} />
      <Card>
        <ActionForm action={createTenancy}>
          <Field name="house_id" label={t('tenancy.house')}>
            <Select
              name="house_id"
              defaultValue={houseId}
              placeholder={t('tenancy.chooseHouse')}
              options={(houses ?? []).map((h) => ({ value: h.id, label: `${h.unit_number} · ${h.properties?.name} · ${t(`status.house.${h.status}`)}` }))}
            />
          </Field>
          <Field name="tenant_id" label={t('tenancy.tenant')} hint={<Link className="text-primary" href={`/owner/tenants/new?next=${encodeURIComponent(here)}`}>+ {t('tenants.add')}</Link>}>
            <Select
              name="tenant_id"
              defaultValue={tenantId}
              placeholder={t('tenancy.chooseTenant')}
              options={freeTenants.map((x) => ({ value: x.id, label: `${x.full_name} · ${x.phone}` }))}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field name="start_date" label={t('tenancy.startDate')}>
              <Input name="start_date" type="date" defaultValue={todayIST()} />
            </Field>
            <Field name="expected_end_date" label={t('tenancy.endDate')} optional>
              <Input name="expected_end_date" type="date" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="rent_paise" label={t('tenancy.rent')}>
              <MoneyInput name="rent_paise" defaultValue={paiseToRupeesInput(selected?.default_rent_paise || null)} />
            </Field>
            <Field name="advance_paise" label={t('tenancy.advance')}>
              <MoneyInput name="advance_paise" defaultValue={paiseToRupeesInput(selected?.default_advance_paise || null)} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field name="notice_period_days" label={t('tenancy.noticeDays')}>
              <Input name="notice_period_days" type="number" min={0} max={365} defaultValue={30} inputMode="numeric" />
            </Field>
            <Field name="rent_due_day" label={t('tenancy.dueDay')} hint={t('tenancy.dueDayHint')}>
              <Input name="rent_due_day" type="number" min={1} max={28} defaultValue={1} inputMode="numeric" />
            </Field>
          </div>
          <p className="text-xs text-muted">{t('tenancy.firstMonthNote')}</p>
          <SubmitButton>{t('common.save')}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
