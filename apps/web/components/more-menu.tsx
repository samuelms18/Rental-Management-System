import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ChevronRight } from 'lucide-react';
import type { NavGroup } from '@/lib/nav';
import { List, Section } from '@/components/ui/card';

/** Phone "More" screen: the same groups as the laptop sidebar. */
export async function MoreMenu({ groups, unread }: { groups: NavGroup[]; unread?: number }) {
  const t = await getTranslations();
  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <Section key={g.label} title={t(`navGroups.${g.label}`)}>
          <List>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} className="flex min-h-14 items-center justify-between border-b border-border px-4 font-medium last:border-b-0 hover:bg-surface-2">
                <span>{t(`nav.${i.label}`)}</span>
                <span className="flex items-center gap-2">
                  {i.badge === 'unread' && !!unread && <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-white">{unread}</span>}
                  <ChevronRight className="size-5 text-muted" />
                </span>
              </Link>
            ))}
          </List>
        </Section>
      ))}
    </div>
  );
}
