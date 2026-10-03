import Link from 'next/link';
import { ChevronRight, Inbox } from 'lucide-react';
import { cn } from './cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card border border-border bg-surface p-5 shadow-card', className)} {...props} />;
}

/** Deep-teal feature panel with the kolam texture (dashboard summaries, rent due). */
export function Hero({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('hero rounded-[24px] p-5 sm:p-6', className)} {...props} />;
}

export function Section({
  title,
  action,
  children,
  className,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-3', className)}>
      {(title || action) && (
        <div className="flex items-end justify-between gap-3 px-1">
          {title && (
            <h2 className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
              <span aria-hidden className="h-3.5 w-1 rounded-full bg-accent" />
              {title}
            </h2>
          )}
          {action && <div className="text-sm font-semibold [&_a]:text-primary [&_a:hover]:underline">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** A tappable list row (≥ 44px). */
export function ListLink({
  href,
  children,
  right,
}: {
  href: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-16 items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-primary-soft/40"
    >
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="tabular shrink-0 text-right">{right}</div>}
      <ChevronRight aria-hidden className="size-4 shrink-0 text-muted/60 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
    </Link>
  );
}

export function List({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-card border border-border bg-surface shadow-card', className)}>{children}</div>;
}

export function ListRow({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="tabular shrink-0 text-right">{right}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border bg-surface/60 px-6 py-10 text-center text-muted">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-primary">
        <Inbox className="size-6" strokeWidth={1.6} />
      </span>
      <p className="max-w-xs text-sm">{children}</p>
    </div>
  );
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="relative overflow-hidden rounded-card border border-border bg-surface p-4 shadow-card">
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 top-0 h-1',
          tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : tone === 'danger' ? 'bg-danger' : 'bg-primary/30',
        )}
      />
      <div className="text-xs font-medium text-muted">{label}</div>
      <div
        className={cn(
          'font-display tabular mt-1.5 break-words text-lg font-semibold leading-tight sm:text-2xl',
          tone === 'ok' && 'text-ok',
          tone === 'warn' && 'text-warn',
          tone === 'danger' && 'text-danger',
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function DefList({ items }: { items: Array<[string, React.ReactNode]> }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words font-medium">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
