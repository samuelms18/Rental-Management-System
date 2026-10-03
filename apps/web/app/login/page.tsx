import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth-card';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { GoogleButton } from '@/components/google-button';
import { signIn } from '@/lib/actions/auth';
import { env } from '@/lib/env';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const t = await getTranslations('auth');
  const { error } = await searchParams;
  return (
    <AuthCard title={t('signIn')}>
      {error === 'disabled' && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{t('disabled')}</p>}
      {error === 'link' && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{t('linkInvalid')}</p>}
      <ActionForm action={signIn}>
        <Field name="email" label={t('email')}>
          <Input name="email" type="email" autoComplete="email" inputMode="email" required />
        </Field>
        <Field name="password" label={t('password')}>
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full sm:w-full">{t('signIn')}</SubmitButton>
      </ActionForm>
      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="inline-flex min-h-11 items-center text-sm text-primary">
          {t('forgot')}
        </Link>
      </div>
      {env.googleSignIn() && (
        <>
          <div className="my-4 text-center text-xs text-muted">{t('or')}</div>
          <GoogleButton label={t('google')} />
        </>
      )}
      <p className="mt-8 text-sm text-muted">{t('noAccount')}</p>
    </AuthCard>
  );
}
