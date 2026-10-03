import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import type { NavItem } from '@/components/nav-links';
import { List } from '@/components/ui/card';

export async function MoreMenu({ items, unread }: { items: NavItem[]; unread?: number }) {
  const t = await getTranslations('nav');
  return (
    <List>
      {items.map((i) => (
        <Link key={i.href} href={i.href} className="group flex min-h-14 items-center justify-between border-b border-border/70 px-4 font-medium last:border-b-0 hover:bg-primary-soft/40">
          <span>{t(i.label)}</span>
          <span className="flex items-center gap-2">
            {i.badge === 'unread' && !!unread && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
            <ChevronRight className="size-5 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </span>
        </Link>
      ))}
    </List>
  );
}
