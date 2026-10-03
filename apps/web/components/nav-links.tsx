'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Bell, Building2, ClipboardList, CreditCard, FileText, Home, IndianRupee, LayoutGrid, MessageCircle,
  Receipt, Search, Settings, ShieldCheck, Users, Wrench, Zap, CheckCircle2, User,
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
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {items.map((i) => {
          const Icon = ICONS[i.icon];
          const active = isActive(i);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px]', active ? 'text-primary' : 'text-muted')}
                aria-current={active ? 'page' : undefined}
              >
                <span className="relative">
                  <Icon className="size-6" strokeWidth={active ? 2.4 : 1.8} />
                  {i.badge === 'unread' && !!unread && (
                    <span className="absolute -right-2 -top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] leading-4 text-white">
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
    <ul className="space-y-0.5">
      {items.map((i) => {
        const Icon = ICONS[i.icon];
        const active = isActive(i);
        return (
          <li key={i.href}>
            <Link
              href={i.href}
              className={cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm',
                active ? 'bg-primary-soft font-medium text-primary' : 'text-fg hover:bg-surface-2',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="size-5" />
              <span className="flex-1">{t(i.label)}</span>
              {i.badge === 'unread' && !!unread && (
                <span className="rounded-full bg-danger px-1.5 text-xs text-white">{unread}</span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
