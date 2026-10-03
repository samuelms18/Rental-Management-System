import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export function PageHeader({
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
  return (
    <header className="mb-5 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-1">
        {back && (
          <Link href={back} className="-ml-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-surface-2" aria-label="Back">
            <ChevronLeft className="size-6" />
          </Link>
        )}
        <div className="min-w-0 pt-1.5">
          <h1 className="text-xl font-semibold leading-tight">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-muted">{subtitle}</div>}
        </div>
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </header>
  );
}
