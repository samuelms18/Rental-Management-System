import { getTranslations } from 'next-intl/server';
import { Building2 } from 'lucide-react';
import { NavLinks, type NavItem } from '@/components/nav-links';

export async function AppShell({
  primary,
  secondary,
  children,
  unread,
}: {
  primary: NavItem[];
  secondary: NavItem[];
  children: React.ReactNode;
  unread?: number;
}) {
  const t = await getTranslations('app');
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-1 overflow-y-auto border-r border-border bg-surface p-3 md:flex">
        <div className="mb-4 flex items-center gap-2 px-2 pt-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-fg">
            <Building2 className="size-5" />
          </div>
          <span className="text-sm font-semibold leading-tight">{t('name')}</span>
        </div>
        <NavLinks items={[...primary.filter((i) => !i.mobileOnly), ...secondary]} variant="sidebar" unread={unread} />
      </aside>
      <div className="min-w-0">
        <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-4 md:px-8 md:pb-12 md:pt-8">{children}</main>
      </div>
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur md:hidden">
        <NavLinks items={primary} variant="bottom" unread={unread} />
      </nav>
    </div>
  );
}
