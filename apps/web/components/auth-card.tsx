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
      <aside className="hero flex flex-col justify-between rounded-b-[28px] px-6 pb-8 pt-10 lg:m-4 lg:rounded-[32px] lg:p-12">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/25 backdrop-blur">
            <Building2 className="size-6" />
          </div>
          <div className="font-display text-lg font-semibold leading-tight">{t('name')}</div>
        </div>
        <div className="mt-8 lg:mt-0">
          <p className="font-display max-w-md text-[1.65rem] font-medium leading-[1.15] lg:text-[2.6rem]">{t('tagline')}</p>
          <ul className="mt-8 hidden space-y-3 lg:block">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-[15px] text-hero-text/85">
                <span className="flex size-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-[18px]" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="kolam-mark mt-8 hidden h-2 w-28 text-white/40 lg:block" />
      </aside>

      <main className="mx-auto flex w-full max-w-sm flex-col justify-center px-5 py-10 lg:py-16">
        <h1 className="font-display mb-6 text-[2rem] font-semibold leading-tight">{title}</h1>
        {children}
        <div className="mt-10">
          <LanguagePicker />
        </div>
      </main>
    </div>
  );
}
