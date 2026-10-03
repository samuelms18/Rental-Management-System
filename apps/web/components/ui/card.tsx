import Link from 'next/link';
import { cn } from './cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-card bg-surface border border-border p-4', className)} {...props} />;
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
        <div className="flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
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
      className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0 hover:bg-surface-2"
    >
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </Link>
  );
}

export function List({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('overflow-hidden rounded-card border border-border bg-surface', className)}>{children}</div>;
}

export function ListRow({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="shrink-0 text-right">{right}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-card border border-dashed border-border p-6 text-center text-muted">{children}</p>;
}

export function Stat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="rounded-card border border-border bg-surface p-3">
      <div className="text-xs text-muted">{label}</div>
      <div
        className={cn(
          'mt-1 text-lg font-semibold',
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
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
