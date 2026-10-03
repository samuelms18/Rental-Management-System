import { getTranslations } from 'next-intl/server';
import { todayIST } from '@fpm/api';
import { ActionForm, Field, Input, MoneyInput, SubmitButton } from '@/components/ui/form';
import { recordCash } from '@/lib/actions/finance';

export async function CashForm({ tenancyId, defaultAmount }: { tenancyId: string; defaultAmount?: string }) {
  const t = await getTranslations();
  return (
    <ActionForm action={recordCash} hidden={{ tenancy_id: tenancyId }} resetOnSuccess>
      <div className="grid grid-cols-2 gap-3">
        <Field name="amount_paise" label={t('common.amount')}>
          <MoneyInput name="amount_paise" defaultValue={defaultAmount} />
        </Field>
        <Field name="paid_on" label={t('pay.paidOn')}>
          <Input name="paid_on" type="date" defaultValue={todayIST()} />
        </Field>
      </div>
      <Field name="received_by" label={t('rent.receivedBy')} hint={t('rent.receivedByHint')}>
        <Input name="received_by" />
      </Field>
      <SubmitButton variant="secondary">{t('rent.recordCash')}</SubmitButton>
    </ActionForm>
  );
}
