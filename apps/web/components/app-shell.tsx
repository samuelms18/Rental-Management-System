import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Building2 } from 'lucide-react';
import { NavLinks, type NavItem } from '@/components/nav-links';
import { cn } from '@/components/ui/cn';

export type ShellViewer = { name: string; role: 'owner' | 'manager' | 'tenant'; profileHref: string };

function BrandMark() {
  return (
    <div className="hero flex size-9 shrink-0 items-center justify-center rounded-xl shadow-none">
      <Building2 className="size-[18px]" />
    </div>
  );
}

function initials(name: string) {
  const parts = name.replace(/[^\p{L}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1]![0] : '')).toUpperCase() || '?';
}

/** Who is signed in, and as what — always visible in the header. */
async function ProfileBadge({ viewer }: { viewer: ShellViewer }) {
  const t = await getTranslations('roles');
  return (
    <Link
      href={viewer.profileHref}
      className="flex min-h-11 items-center gap-2.5 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-card transition hover:shadow-lift"
      aria-label={`${viewer.name} · ${t(viewer.role)}`}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {initials(viewer.name)}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block max-w-[9rem] truncate text-[13px] font-bold">{viewer.name}</span>
        <span
          className={cn(
            'block text-[11px] font-semibold',
            viewer.role === 'owner' ? 'text-primary' : viewer.role === 'manager' ? 'text-info' : 'text-muted',
          )}
        >
          {t(viewer.role)}
        </span>
      </span>
    </Link>
  );
}

export async function AppShell({
  primary,
  secondary,
  children,
  unread,
  viewer,
}: {
  primary: NavItem[];
  secondary: NavItem[];
  children: React.ReactNode;
  unread?: number;
  viewer: ShellViewer;
}) {
  const t = await getTranslations('app');
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[256px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-border bg-surface px-3 pb-4 md:flex">
        <div className="mb-4 flex items-center gap-2.5 px-2 pt-5">
          <BrandMark />
          <span className="text-[15px] font-extrabold leading-tight tracking-[-0.01em] text-primary">{t('name')}</span>
        </div>
        <NavLinks items={[...primary.filter((i) => !i.mobileOnly), ...secondary]} variant="sidebar" unread={unread} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur md:px-10">
          <div className="flex min-w-0 items-center gap-2.5 md:invisible">
            <BrandMark />
            <span className="truncate text-[15px] font-extrabold tracking-[-0.01em] text-primary">{t('name')}</span>
          </div>
          <ProfileBadge viewer={viewer} />
        </header>
        <main data-stagger className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 md:px-10 md:pb-14 md:pt-8">{children}</main>
      </div>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface md:hidden">
        <NavLinks items={primary} variant="bottom" unread={unread} />
      </nav>
    </div>
  );
}
