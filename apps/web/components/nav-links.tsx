'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bell, Building2, ClipboardList, CreditCard, FileText, Home, IndianRupee, LayoutGrid, MessageCircle,
  Receipt, Search, Settings, ShieldCheck, Users, Wrench, Zap, CheckCircle2, User, ChevronDown,
} from 'lucide-react';
import { cn } from '@/components/ui/cn';

const ICONS = {
  home: Home, building: Building2, users: Users, rupee: IndianRupee, check: CheckCircle2, zap: Zap,
  wrench: Wrench, receipt: Receipt, message: MessageCircle, list: ClipboardList, search: Search, bell: Bell,
  user: User, more: LayoutGrid, card: CreditCard, file: FileText, shield: ShieldCheck, settings: Settings,
} as const;

export type NavItem = {
  href: string;
  label: string; // i18n key under "nav"
  icon: keyof typeof ICONS;
  exact?: boolean;
  mobileOnly?: boolean;
  badge?: 'unread';
};

export function NavLinks({ items, variant, unread }: { items: NavItem[]; variant: 'bottom' | 'sidebar'; unread?: number }) {
  const pathname = usePathname();
  const t = useTranslations('nav');
  const isActive = (i: NavItem) => (i.exact ? pathname === i.href : pathname === i.href || pathname.startsWith(`${i.href}/`));

  if (variant === 'bottom') {
    return (
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1 pt-1">
        {items.map((i) => {
          const Icon = ICONS[i.icon];
          const active = isActive(i);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors',
                  active ? 'font-bold text-primary' : 'font-medium text-muted hover:text-fg',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative flex h-7 items-center justify-center">
                  <Icon className="size-6" strokeWidth={active ? 2.2 : 1.7} />
                  {i.badge === 'unread' && !!unread && (
                    <span className="absolute -right-3 -top-0.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-white ring-2 ring-surface">
                      {unread > 9 ? '9+' : unread}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-1">{t(i.label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const active = isActive(i);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
                active ? 'bg-primary-soft font-bold text-primary' : 'font-medium text-fg hover:bg-surface-2',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-[19px]" strokeWidth={active ? 2.2 : 1.8} />
              <span className="flex-1">{t(i.label)}</span>
              {i.badge === 'unread' && !!unread && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold leading-none text-white">{unread}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Sidebar: main items, then collapsible groups (a group opens when it holds the current page). */
export function GroupedNav({
  primary,
  groups,
  unread,
}: {
  primary: NavItem[];
  groups: Array<{ label: string; items: NavItem[] }>;
  unread?: number;
}) {
  const pathname = usePathname();
  const t = useTranslations('navGroups');
  const holdsActive = (items: NavItem[]) => items.some((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  const [open, setOpen] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(groups.map((g, n) => [g.label, n === 0 || holdsActive(g.items)])),
  );
  return (
    <div className="space-y-4">
      <NavLinks items={primary} variant="sidebar" unread={unread} />
      {groups.map((g) => {
        const isOpen = open[g.label] || holdsActive(g.items);
        return (
          <div key={g.label}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen((o) => ({ ...o, [g.label]: !isOpen }))}
              className="flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-xs font-bold uppercase tracking-[0.08em] text-muted hover:text-fg"
            >
              {t(g.label)}
              <ChevronDown className={cn('size-4 transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen && <NavLinks items={g.items} variant="sidebar" unread={unread} />}
          </div>
        );
      })}
    </div>
  );
}
