import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, formatMonth, paiseToRupeesInput } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { ListRow } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, SubmitButton } from '@/components/ui/form';
import { Money } from '@/components/ui/money';
import { cancelCharge, editCharge } from '@/lib/actions/finance';

export type ChargeLike = {
  id: string; type: string; period_start: string; period_end: string; amount_paise: number; due_date: string;
  status: string; notes: string | null; paid_paise?: number;
};

export async function ChargeRow({ c, editable }: { c: ChargeLike; editable?: boolean }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const partial = c.period_start.slice(8) !== '01' || c.period_end.slice(0, 7) !== c.period_start.slice(0, 7);
  return (
    <ListRow
      right={
        <>
          <Money paise={c.amount_paise} className="font-semibold" />
          <div className="mt-1"><Badge tone={toneFor(c.status)}>{t(`status.charge.${c.status}`)}</Badge></div>
        </>
      }
    >
      <div className="font-medium">{t(`labels.chargeType.${c.type}`)} · {c.type === 'rent' && !partial ? formatMonth(c.period_start, locale) : `${formatDate(c.period_start, locale)} – ${formatDate(c.period_end, locale)}`}</div>
      <div className="text-xs text-muted">{t('rent.due', { date: formatDate(c.due_date, locale) })}{c.paid_paise ? <> · {t('rent.paid')} <Money paise={c.paid_paise} /></> : null}</div>
      {c.notes && <div className="text-xs text-muted">{c.notes}</div>}
      {editable && c.status !== 'cancelled' && c.status !== 'paid' && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm text-primary">{t('rent.editCharge')}</summary>
          <div className="mt-3 space-y-4">
            <ActionForm action={editCharge} hidden={{ id: c.id }}>
              <div className="grid grid-cols-2 gap-3">
                <Field name="amount_paise" label={t('common.amount')}>
                  <MoneyInput name="amount_paise" defaultValue={paiseToRupeesInput(c.amount_paise)} />
                </Field>
                <Field name="due_date" label={t('rent.dueDate')}>
                  <Input name="due_date" type="date" defaultValue={c.due_date} />
                </Field>
              </div>
              <Field name="notes" label={t('common.notes')} optional>
                <Input name="notes" defaultValue={c.notes ?? ''} />
              </Field>
              <SubmitButton variant="secondary">{t('common.save')}</SubmitButton>
            </ActionForm>
            {!c.paid_paise && (
              <ActionForm action={cancelCharge} hidden={{ id: c.id }} className="flex items-end gap-2 space-y-0">
                <div className="flex-1">
                  <Field name="reason" label={t('common.reason')}>
                    <Input name="reason" />
                  </Field>
                </div>
                <SubmitButton variant="danger">{t('rent.cancelCharge')}</SubmitButton>
              </ActionForm>
            )}
          </div>
        </details>
      )}
    </ListRow>
  );
}
