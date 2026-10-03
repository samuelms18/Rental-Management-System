import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth-card';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { setPassword } from '@/lib/actions/auth';
import { getViewer } from '@/lib/auth';

export default async function SetPasswordPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/login?error=link');
  const t = await getTranslations('auth');
  return (
    <AuthCard title={t('setPasswordTitle')}>
      <ActionForm action={setPassword}>
        <Field name="password" label={t('newPassword')} hint={t('setPasswordHelp')}>
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <Field name="confirm" label={t('confirmPassword')}>
          <Input name="confirm" type="password" autoComplete="new-password" required />
        </Field>
        <SubmitButton className="w-full sm:w-full">{t('setPasswordTitle')}</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
