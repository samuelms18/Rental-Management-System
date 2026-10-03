import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronLeft } from 'lucide-react';

export async function PageHeader({
  title,
  subtitle,
  back,
  action,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: string;
  action?: React.ReactNode;
}) {
  const t = await getTranslations('common');
  return (
    <header className="mb-6 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {back && (
          <Link
            href={back}
            className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface shadow-card transition hover:border-primary/40 hover:text-primary"
            aria-label={t('back')}
          >
            <ChevronLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0 pt-0.5">
          <h1 className="font-display text-[1.75rem] font-semibold leading-[1.1] sm:text-[2rem]">{title}</h1>
          {subtitle && <div className="mt-1.5 text-sm text-muted">{subtitle}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </header>
  );
}
