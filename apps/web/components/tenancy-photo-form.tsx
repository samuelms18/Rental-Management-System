import { getTranslations } from 'next-intl/server';
import { PHOTO_AREAS } from '@fpm/validation';
import { ActionForm, Field, Select, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { addTenancyPhotos } from '@/lib/actions/move';

export async function TenancyPhotoForm({ tenancyId, stage }: { tenancyId: string; stage: 'move_in' | 'move_out' }) {
  const t = await getTranslations();
  return (
    <ActionForm action={addTenancyPhotos} hidden={{ tenancy_id: tenancyId, stage }} resetOnSuccess>
      <Field name="area" label={t('houses.area_label')}>
        <Select name="area" options={PHOTO_AREAS.map((a) => ({ value: a, label: t(`labels.photoArea.${a}`) }))} />
      </Field>
      <Field name="files" label={t('houses.addPhoto')}>
        <FileInput name="files" multiple capture />
      </Field>
      <SubmitButton variant="secondary">{t('common.upload')}</SubmitButton>
    </ActionForm>
  );
}
