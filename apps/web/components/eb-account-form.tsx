import { getTranslations } from 'next-intl/server';
import type { Tables } from '@fpm/types';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { saveEbAccount } from '@/lib/actions/eb';

export async function EbAccountForm({ houseId, account }: { houseId: string; account: Tables<'eb_accounts'> | null }) {
  const t = await getTranslations();
  return (
    <ActionForm action={saveEbAccount} hidden={{ house_id: houseId }}>
      {!account && <p className="text-sm text-muted">{t('eb.noAccount')}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field name="service_number" label={t('eb.serviceNumber')}>
          <Input name="service_number" defaultValue={account?.service_number ?? ''} />
        </Field>
        <Field name="meter_number" label={t('eb.meterNumber')} optional>
          <Input name="meter_number" defaultValue={account?.meter_number ?? ''} />
        </Field>
      </div>
      <Field name="consumer_name" label={t('eb.consumerName')} optional>
        <Input name="consumer_name" defaultValue={account?.consumer_name ?? ''} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field name="billing_cycle" label={t('eb.billingCycle')}>
          <Select name="billing_cycle" defaultValue={account?.billing_cycle ?? 'bimonthly'} options={['bimonthly', 'monthly'].map((v) => ({ value: v, label: t(`labels.billingCycle.${v}`) }))} />
        </Field>
        <Field name="default_paid_by" label={t('eb.whoPays')}>
          <Select name="default_paid_by" defaultValue={account?.default_paid_by ?? 'owner_reimbursed'} options={['owner_reimbursed', 'tenant_direct'].map((v) => ({ value: v, label: t(`labels.ebPaidBy.${v}`) }))} />
        </Field>
      </div>
      <SubmitButton variant={account ? 'secondary' : 'primary'}>{account ? t('common.save') : t('eb.addAccount')}</SubmitButton>
    </ActionForm>
  );
}
