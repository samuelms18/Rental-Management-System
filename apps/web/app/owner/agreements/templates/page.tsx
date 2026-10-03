import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { List, ListLink } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';

export default async function TemplatesPage() {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const { data } = await supabase.from('agreement_templates').select('id, name, version, is_active, reviewed_by_note').order('created_at');
  return (
    <>
      <PageHeader title={t('agreements.templates')} back="/owner/agreements" action={<LinkButton href="/owner/agreements/templates/new" size="sm">{t('common.add')}</LinkButton>} />
      <List>
        {(data ?? []).map((x) => (
          <ListLink key={x.id} href={`/owner/agreements/templates/${x.id}`} right={<Badge tone={x.is_active ? 'ok' : 'neutral'}>v{x.version}</Badge>}>
            <div className="font-medium">{x.name}</div>
            {x.reviewed_by_note && <div className="text-xs text-muted">{x.reviewed_by_note}</div>}
          </ListLink>
        ))}
      </List>
    </>
  );
}
