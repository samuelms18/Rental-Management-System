import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth-card';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { requestPasswordReset } from '@/lib/actions/auth';

export default async function ForgotPage() {
  const t = await getTranslations('auth');
  return (
    <AuthCard title={t('resetTitle')}>
      <ActionForm action={requestPasswordReset}>
        <Field name="email" label={t('email')}>
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <SubmitButton className="w-full sm:w-full">{t('resetSend')}</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
