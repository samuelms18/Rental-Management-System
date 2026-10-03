import { getTranslations } from 'next-intl/server';
import { Building2 } from 'lucide-react';
import { LanguagePicker } from '@/components/language-picker';

export async function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const t = await getTranslations('app');
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-fg">
          <Building2 className="size-6" />
        </div>
        <div className="text-lg font-semibold leading-tight">{t('name')}</div>
      </div>
      <h1 className="mb-5 text-2xl font-semibold">{title}</h1>
      {children}
      <div className="mt-10">
        <LanguagePicker />
      </div>
    </main>
  );
}
