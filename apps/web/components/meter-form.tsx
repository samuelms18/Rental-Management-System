import { getTranslations } from 'next-intl/server';
import { todayIST } from '@fpm/api';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { addMeterReading } from '@/lib/actions/move';

export async function MeterForm({ tenancyId, stage }: { tenancyId: string; stage: 'move_in' | 'move_out' | 'regular' }) {
  const t = await getTranslations();
  return (
    <ActionForm action={addMeterReading} hidden={{ tenancy_id: tenancyId, stage }} resetOnSuccess>
      <div className="grid grid-cols-2 gap-3">
        <Field name="reading" label={t('moveIn.meterReading')}>
          <Input name="reading" inputMode="decimal" />
        </Field>
        <Field name="read_on" label={t('common.date')}>
          <Input name="read_on" type="date" defaultValue={todayIST()} />
        </Field>
      </div>
      <Field name="photo" label={t('moveIn.meterPhoto')} optional>
        <FileInput name="photo" capture />
      </Field>
      <SubmitButton variant="secondary">{t('common.save')}</SubmitButton>
    </ActionForm>
  );
}
