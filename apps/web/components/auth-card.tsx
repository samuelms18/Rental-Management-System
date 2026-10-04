import { getTranslations } from 'next-intl/server';
import { Building2, FileSignature, IndianRupee, Wrench } from 'lucide-react';
import { LanguagePicker } from '@/components/language-picker';

export async function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  const t = await getTranslations('app');
  const features = [
    { icon: IndianRupee, text: t('feature1') },
    { icon: FileSignature, text: t('feature2') },
    { icon: Wrench, text: t('feature3') },
  ];
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel: a short strip on phones, a full column on large screens. */}
      <aside className="hero flex flex-col justify-between rounded-b-[24px] px-6 pb-8 pt-8 lg:m-4 lg:rounded-[24px] lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/25 backdrop-blur">
            <Building2 className="size-6" />
          </div>
          <div className="text-lg font-extrabold leading-tight tracking-[-0.01em]">{t('name')}</div>
        </div>
        <div className="mt-8 lg:mt-0">
          <p className="max-w-md text-[1.5rem] font-extrabold leading-[1.2] tracking-[-0.02em] lg:text-[2.5rem]">{t('tagline')}</p>
          <ul className="mt-8 hidden space-y-3 lg:block">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] opacity-90">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-[18px]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="mx-auto flex w-full max-w-sm flex-col justify-center px-5 py-10 lg:py-16">
        <h1 className="mb-6 text-[26px] font-extrabold leading-tight tracking-[-0.02em]">{title}</h1>
        {children}
        <div className="mt-10">
          <LanguagePicker />
        </div>
      </main>
    </div>
  );
}
