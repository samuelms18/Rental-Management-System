import { getTranslations } from 'next-intl/server';
import { paiseToRupeesInput, todayIST } from '@fpm/api';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { submitPayment } from '@/lib/actions/finance';

export async function PayForm({
  tenancyId,
  charges,
  paidTo = 'owner',
  defaultAmountPaise,
}: {
  tenancyId: string;
  charges: Array<{ id: string; label: string; outstanding_paise: number }>;
  paidTo?: 'owner' | 'tneb';
  /** Pre-filled amount; defaults to what is owed on the first charge. */
  defaultAmountPaise?: number;
}) {
  const t = await getTranslations();
  return (
    <ActionForm action={submitPayment} hidden={{ tenancy_id: tenancyId, paid_to: paidTo }} resetOnSuccess>
      {charges.length > 1 && (
        <Field name="charge_id" label={t('pay.forCharge')}>
          <Select name="charge_id" options={charges.map((c) => ({ value: c.id, label: c.label }))} />
        </Field>
      )}
      {charges.length === 1 && <input type="hidden" name="charge_id" value={charges[0]!.id} />}
      <div className="grid grid-cols-2 gap-3">
        <Field name="amount_paise" label={t('common.amount')}>
          <MoneyInput name="amount_paise" defaultValue={paiseToRupeesInput(defaultAmountPaise ?? charges[0]?.outstanding_paise)} />
        </Field>
        <Field name="paid_on" label={t('pay.paidOn')}>
          <Input name="paid_on" type="date" defaultValue={todayIST()} max={todayIST()} />
        </Field>
      </div>
      <Field name="method" label={t('pay.method')}>
        <Select name="method" options={['upi', 'bank_transfer', 'other'].map((m) => ({ value: m, label: t(`labels.method.${m}`) }))} />
      </Field>
      <Field name="utr_reference" label={t('pay.utr')} hint={t('pay.utrHint')}>
        <Input name="utr_reference" inputMode="numeric" autoComplete="off" autoCapitalize="characters" />
      </Field>
      <Field name="proof" label={t('pay.screenshot')}>
        <FileInput name="proof" accept="image/*,application/pdf" />
      </Field>
      <SubmitButton className="w-full sm:w-full">{t('pay.iPaid')}</SubmitButton>
    </ActionForm>
  );
}
