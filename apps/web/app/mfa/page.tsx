import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AuthCard } from '@/components/auth-card';
import { MfaForm } from '@/components/mfa-form';
import { getViewer } from '@/lib/auth';

/** Staff must pass TOTP 2FA (AAL2). The database refuses staff data without it. */
export default async function MfaPage() {
  const viewer = await getViewer();
  if (!viewer) redirect('/login');
  if (!viewer.isStaffRole) redirect('/tenant');
  if (viewer.aal === 'aal2') redirect('/owner');
  const t = await getTranslations('mfa');
  return (
    <AuthCard title={t('title')}>
      <MfaForm mode={viewer.hasMfaFactor ? 'verify' : 'enroll'} />
    </AuthCard>
  );
}
