import { getTranslations } from 'next-intl/server';
import { locales } from '@fpm/i18n';
import type { Tables } from '@fpm/types';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { Card, Section } from '@/components/ui/card';
import { Button, LinkButton } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { updateProfile } from '@/lib/actions/account';
import { signOut } from '@/lib/actions/auth';

export async function ProfileView({ profile, roleLabel }: { profile: Tables<'profiles'>; roleLabel: string }) {
  const t = await getTranslations();
  return (
    <>
      <PageHeader title={t('profile.title')} subtitle={`${profile.email ?? ''} · ${roleLabel}`} />
      <div className="space-y-6">
        <Card>
          <ActionForm action={updateProfile}>
            <Field name="full_name" label={t('profile.fullName')}>
              <Input name="full_name" defaultValue={profile.full_name} autoComplete="name" />
            </Field>
            <Field name="phone" label={t('profile.phone')} optional>
              <Input name="phone" type="tel" inputMode="tel" defaultValue={profile.phone ?? ''} autoComplete="tel" />
            </Field>
            <Field name="preferred_language" label={t('profile.language')}>
              <Select
                name="preferred_language"
                defaultValue={profile.preferred_language}
                options={locales.map((l) => ({ value: l, label: t(`languages.${l}`) }))}
              />
            </Field>
            <SubmitButton>{t('common.save')}</SubmitButton>
          </ActionForm>
        </Card>
        <Section title={t('profile.changePassword')}>
          <LinkButton href="/auth/set-password" variant="secondary">{t('profile.changePassword')}</LinkButton>
        </Section>
        <div className="flex flex-col gap-3 sm:flex-row">
          <form action={signOut}>
            <Button type="submit" variant="secondary" className="w-full">{t('common.signOut')}</Button>
          </form>
          <form action={signOut}>
            <input type="hidden" name="scope" value="global" />
            <Button type="submit" variant="ghost" className="w-full">{t('auth.signOutAll')}</Button>
          </form>
        </div>
        <p className="text-xs text-muted">{t('profile.dataContact')}</p>
      </div>
    </>
  );
}
