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
        <Link key={i.href} href={i.href} className="flex min-h-14 items-center justify-between border-b border-border px-4 last:border-b-0 hover:bg-surface-2">
          <span>{t(i.label)}</span>
          <span className="flex items-center gap-2">
            {i.badge === 'unread' && !!unread && <span className="rounded-full bg-danger px-2 text-xs text-white">{unread}</span>}
            <ChevronRight className="size-5 text-muted" />
          </span>
        </Link>
      ))}
    </List>
  );
}
