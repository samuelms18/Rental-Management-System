import { getTranslations } from 'next-intl/server';
import { paiseToRupeesInput } from '@fpm/api';
import type { Tables } from '@fpm/types';
import { ActionForm, Field, Input, MoneyInput, SubmitButton, Textarea } from '@/components/ui/form';
import { saveHouse } from '@/lib/actions/properties';

export async function HouseForm({ propertyId, house }: { propertyId: string; house?: Tables<'houses'> }) {
  const t = await getTranslations();
  return (
    <ActionForm action={saveHouse} hidden={{ id: house?.id, property_id: propertyId }}>
      <div className="grid grid-cols-2 gap-3">
        <Field name="unit_number" label={t('houses.unitNumber')} hint={t('houses.unitHint')}>
          <Input name="unit_number" defaultValue={house?.unit_number} required autoCapitalize="characters" />
        </Field>
        <Field name="floor" label={t('houses.floor')} optional>
          <Input name="floor" defaultValue={house?.floor ?? ''} />
        </Field>
      </div>
      <Field name="unit_type" label={t('houses.unitType')} hint={t('houses.unitTypeHint')} optional>
        <Input name="unit_type" defaultValue={house?.unit_type ?? ''} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field name="bedrooms" label={t('houses.bedrooms')} optional>
          <Input name="bedrooms" type="number" min={0} inputMode="numeric" defaultValue={house?.bedrooms ?? ''} />
        </Field>
        <Field name="bathrooms" label={t('houses.bathrooms')} optional>
          <Input name="bathrooms" type="number" min={0} inputMode="numeric" defaultValue={house?.bathrooms ?? ''} />
        </Field>
        <Field name="area_sqft" label={t('houses.area')} optional>
          <Input name="area_sqft" type="number" min={1} inputMode="numeric" defaultValue={house?.area_sqft ?? ''} />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field name="default_rent_paise" label={t('houses.defaultRent')} optional>
          <MoneyInput name="default_rent_paise" defaultValue={paiseToRupeesInput(house?.default_rent_paise)} />
        </Field>
        <Field name="default_advance_paise" label={t('houses.defaultAdvance')} optional>
          <MoneyInput name="default_advance_paise" defaultValue={paiseToRupeesInput(house?.default_advance_paise)} />
        </Field>
      </div>
      <Field name="notes" label={t('common.notes')} optional>
        <Textarea name="notes" defaultValue={house?.notes ?? ''} />
      </Field>
      <SubmitButton>{t('common.save')}</SubmitButton>
    </ActionForm>
  );
}
