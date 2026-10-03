import { getTranslations } from 'next-intl/server';
import { Building2 } from 'lucide-react';
import { NavLinks, type NavItem } from '@/components/nav-links';

function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div
      className={
        size === 'sm'
          ? 'hero flex size-9 items-center justify-center rounded-xl'
          : 'hero flex size-11 items-center justify-center rounded-2xl'
      }
    >
      <Building2 className={size === 'sm' ? 'size-[18px]' : 'size-5'} />
    </div>
  );
}

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
    <div className="min-h-dvh md:grid md:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col overflow-y-auto border-r border-border bg-surface/80 px-3 pb-4 backdrop-blur md:flex">
        <div className="mb-5 flex items-center gap-3 px-2 pt-5">
          <BrandMark />
          <div className="min-w-0">
            <div className="font-display text-[17px] font-semibold leading-tight">{t('name')}</div>
            <div aria-hidden className="kolam-mark mt-1.5 h-1.5 w-16 text-accent/60" />
          </div>
        </div>
        <NavLinks items={[...primary.filter((i) => !i.mobileOnly), ...secondary]} variant="sidebar" unread={unread} />
      </aside>
      <div className="min-w-0">
        <header className="sticky top-0 z-20 flex items-center gap-2.5 border-b border-border/60 bg-bg/80 px-4 py-2.5 backdrop-blur-md md:hidden">
          <BrandMark size="sm" />
          <span className="font-display text-[15px] font-semibold">{t('name')}</span>
        </header>
        <main data-stagger className="mx-auto w-full max-w-3xl px-4 pb-32 pt-5 md:px-10 md:pb-14 md:pt-10">{children}</main>
      </div>
      <nav style={{ bottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }} className="fixed inset-x-3 z-30 rounded-[22px] border border-border bg-surface/90 shadow-lift backdrop-blur-xl md:hidden">
        <NavLinks items={primary} variant="bottom" unread={unread} />
      </nav>
    </div>
  );
}
