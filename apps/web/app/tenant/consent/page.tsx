import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth-card';
import { ActionForm, Checkbox, SubmitButton } from '@/components/ui/form';
import { requireTenant } from '@/lib/auth';
import { acceptConsent } from '@/lib/actions/tenancy';

/** DPDP Act 2023: privacy notice in the tenant's language, consent recorded before documents. */
export default async function ConsentPage() {
  const viewer = await requireTenant({ allowWithoutConsent: true });
  if (viewer.hasConsent) redirect('/tenant');
  const t = await getTranslations('consent');
  const locale = await getLocale();
  return (
    <AuthCard title={t('title')}>
      <div className="space-y-3 text-sm leading-relaxed">
        <p>{t('body1')}</p>
        <p>{t('body2')}</p>
        <p>{t('body3')}</p>
        <p>{t('body4')}</p>
      </div>
      <ActionForm action={acceptConsent} hidden={{ language: locale }} className="mt-6">
        <Checkbox name="accept" label={t('accept')} />
        <SubmitButton className="w-full sm:w-full">{t('continue')}</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
