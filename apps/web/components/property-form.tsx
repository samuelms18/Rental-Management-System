import { getTranslations } from 'next-intl/server';
import type { Tables } from '@fpm/types';
import { ActionForm, Field, Input, SubmitButton, Textarea } from '@/components/ui/form';
import { saveProperty } from '@/lib/actions/properties';

export async function PropertyForm({ property }: { property?: Tables<'properties'> }) {
  const t = await getTranslations();
  return (
    <ActionForm action={saveProperty} hidden={{ id: property?.id }}>
      <Field name="name" label={t('properties.name')}>
        <Input name="name" defaultValue={property?.name} required />
      </Field>
      <Field name="address_line" label={t('properties.address')} optional>
        <Textarea name="address_line" defaultValue={property?.address_line} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field name="city" label={t('properties.city')} optional>
          <Input name="city" defaultValue={property?.city} />
        </Field>
        <Field name="pin" label={t('properties.pin')} optional>
          <Input name="pin" inputMode="numeric" maxLength={6} defaultValue={property?.pin ?? ''} />
        </Field>
      </div>
      <Field name="state" label={t('properties.state')} optional>
        <Input name="state" defaultValue={property?.state ?? 'Tamil Nadu'} />
      </Field>
      <Field name="description" label={t('properties.description')} optional>
        <Textarea name="description" defaultValue={property?.description ?? ''} />
      </Field>
      <Field name="notes" label={t('common.notes')} optional>
        <Textarea name="notes" defaultValue={property?.notes ?? ''} />
      </Field>
      <SubmitButton>{t('common.save')}</SubmitButton>
    </ActionForm>
  );
}
