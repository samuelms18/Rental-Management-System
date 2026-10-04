import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Bell, Building2 } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { APP_VERSION } from '@/lib/version';
import { GroupedNav, NavLinks, type NavItem } from '@/components/nav-links';
import type { NavGroup } from '@/lib/nav';
import { cn } from '@/components/ui/cn';

export type ShellViewer = { name: string; role: 'owner' | 'manager' | 'tenant'; profileHref: string; notificationsHref: string };

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
      className="flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 shadow-card transition hover:shadow-lift"
      aria-label={`${viewer.name} · ${t(viewer.role)}`}
    >
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
        {initials(viewer.name)}
      </span>
      <span className="min-w-0 leading-tight">
        <span className="block max-w-[4.5rem] truncate text-[13px] font-bold sm:max-w-[10rem]">{viewer.name}</span>
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
  groups,
  children,
  unread,
  viewer,
}: {
  primary: NavItem[];
  groups: NavGroup[];
  children: React.ReactNode;
  unread?: number;
  viewer: ShellViewer;
}) {
  const t = await getTranslations();
  return (
    <div className="min-h-dvh">
      {/* Top bar on every screen: home name on the left, who is signed in on the right. */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur-md md:px-6">
        <Link href={primary[0]?.href ?? '/'} className="flex min-w-0 items-center gap-2.5">
          <BrandMark />
          {/* Phones narrower than ~430px show just the logo, so the bell, theme switch and profile card always fit. */}
          <span className="hidden min-w-0 leading-tight min-[430px]:block">
            <span className="block truncate text-[15px] font-extrabold tracking-[-0.01em] text-primary">{t('app.homeName')}</span>
            <span className="hidden truncate text-[11px] font-medium text-muted sm:block">{t('app.name')}</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle label={t('app.toggleTheme')} />
          <Link
            href={viewer.notificationsHref}
            aria-label={unread ? `${t('nav.notifications')} (${unread})` : t('nav.notifications')}
            className="relative flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-fg shadow-card transition hover:shadow-lift"
          >
            <Bell className="size-5" />
            {!!unread && (
              <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-primary px-1.5 text-center text-[11px] font-bold leading-5 text-white ring-2 ring-bg">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <ProfileBadge viewer={viewer} />
        </div>
      </header>
      <div className="md:grid md:grid-cols-[256px_1fr]">
        <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] overflow-y-auto border-r border-border bg-surface/80 px-3 py-4 backdrop-blur md:block">
          <GroupedNav primary={primary.filter((i) => !i.mobileOnly)} groups={groups} unread={unread} />
          <p className="mt-6 px-3 text-[11px] text-muted">{t('app.version', { v: APP_VERSION })}</p>
        </aside>
        <main data-stagger className="mx-auto w-full min-w-0 max-w-5xl px-4 pb-28 pt-6 md:px-10 md:pb-14 md:pt-8">{children}</main>
      </div>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <NavLinks items={primary} variant="bottom" unread={unread} />
      </nav>
    </div>
  );
}
