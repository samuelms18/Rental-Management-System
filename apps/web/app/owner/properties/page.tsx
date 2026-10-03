import { getTranslations } from 'next-intl/server';
import { Plus } from 'lucide-react';
import { Empty, List, ListLink } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';

export default async function PropertiesPage() {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const { data } = await supabase.from('properties').select('id, name, city, houses(id, status)').order('name');
  return (
    <>
      <PageHeader title={t('properties.title')} action={<LinkButton href="/owner/properties/new" size="sm"><Plus className="size-4" />{t('common.add')}</LinkButton>} />
      {!data?.length ? (
        <Empty>{t('properties.empty')}</Empty>
      ) : (
        <List>
          {data.map((p) => (
            <ListLink
              key={p.id}
              href={`/owner/properties/${p.id}`}
              right={<span className="text-sm text-muted">{p.houses.filter((h) => h.status === 'occupied').length}/{p.houses.length}</span>}
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-muted">{p.city}</div>
            </ListLink>
          ))}
        </List>
      )}
    </>
  );
}
