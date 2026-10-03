import { getTranslations } from 'next-intl/server';
import { locales } from '@fpm/i18n';
import type { Tables } from '@fpm/types';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { saveTenant } from '@/lib/actions/tenancy';

export async function TenantForm({ tenant, next }: { tenant?: Tables<'tenants'>; next?: string }) {
  const t = await getTranslations();
  return (
    <ActionForm action={saveTenant} hidden={{ id: tenant?.id, next }}>
      <Field name="full_name" label={t('tenants.fullName')}>
        <Input name="full_name" defaultValue={tenant?.full_name} autoComplete="off" />
      </Field>
      <Field name="phone" label={t('tenants.phone')} hint={t('tenants.phoneHint')}>
        <Input name="phone" type="tel" inputMode="tel" defaultValue={tenant?.phone} />
      </Field>
      <Field name="email" label={t('tenants.email')} hint={t('tenants.emailHint')}>
        <Input name="email" type="email" inputMode="email" autoCapitalize="off" defaultValue={tenant?.email} />
      </Field>
      {!tenant && (
        <Field name="preferred_language" label={t('tenants.language')}>
          <Select name="preferred_language" options={locales.map((l) => ({ value: l, label: t(`languages.${l}`) }))} />
        </Field>
      )}
      <Field name="permanent_address" label={t('tenants.address')} optional>
        <Textarea name="permanent_address" defaultValue={tenant?.permanent_address ?? ''} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field name="emergency_contact_name" label={t('tenants.emergencyName')} optional>
          <Input name="emergency_contact_name" defaultValue={tenant?.emergency_contact_name ?? ''} />
        </Field>
        <Field name="emergency_contact_phone" label={t('tenants.emergencyPhone')} optional>
          <Input name="emergency_contact_phone" type="tel" inputMode="tel" defaultValue={tenant?.emergency_contact_phone ?? ''} />
        </Field>
      </div>
      {!tenant && <Checkbox name="invite" label={t('tenants.invite')} defaultChecked />}
      {tenant && <input type="hidden" name="preferred_language" value="en" />}
      <SubmitButton>{t('common.save')}</SubmitButton>
    </ActionForm>
  );
}
