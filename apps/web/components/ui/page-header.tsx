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
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface transition hover:bg-surface-2"
            aria-label={t('back')}
          >
            <ChevronLeft className="size-5" />
          </Link>
        )}
        <div className="min-w-0 pt-0.5">
          <h1 className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.02em] sm:text-[30px]">{title}</h1>
          {subtitle && <div className="mt-1 text-[15px] text-muted">{subtitle}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </header>
  );
}
