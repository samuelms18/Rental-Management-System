import { getTranslations } from 'next-intl/server';
import { Building2 } from 'lucide-react';

/** Shown by loading.tsx while a page's data loads: brand mark in a spinning ring, then skeleton cards. */
export async function Preloader() {
  const t = await getTranslations('app');
  return (
    <div role="status" aria-live="polite" className="space-y-6">
      <div className="flex items-center gap-3 py-2">
        <span className="relative flex size-11 items-center justify-center">
          <span className="preloader-ring absolute inset-0 rounded-full border-[3px] border-primary/20 border-t-primary" />
          <Building2 className="size-5 text-primary" />
        </span>
        <span className="text-sm font-semibold text-muted">{t('loading')}</span>
      </div>
      <div className="h-8 w-2/3 animate-pulse rounded-lg bg-surface-2" />
      <div className="h-40 animate-pulse rounded-[24px] bg-primary-soft" />
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-card bg-surface-2" />)}
      </div>
      <div className="h-32 animate-pulse rounded-card bg-surface-2" />
    </div>
  );
}
