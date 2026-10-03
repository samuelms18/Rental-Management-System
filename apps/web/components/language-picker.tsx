'use client';

import { useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { locales } from '@fpm/i18n';
import { setLanguage } from '@/lib/actions/auth';
import { cn } from '@/components/ui/cn';

export function LanguagePicker() {
  const current = useLocale();
  const t = useTranslations('languages');
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap gap-2" aria-busy={pending}>
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => start(async () => { await setLanguage(l); router.refresh(); })}
          className={cn(
            'min-h-11 rounded-full border px-4 text-sm font-medium transition-colors',
            l === current ? 'border-primary bg-primary text-primary-fg shadow-card' : 'border-border bg-surface hover:border-primary/40',
          )}
          lang={l}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
