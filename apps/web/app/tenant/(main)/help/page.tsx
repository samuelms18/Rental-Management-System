import { getTranslations } from 'next-intl/server';
import { Button } from '@/components/ui/button';
import { Card, Empty, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';
import { addHelp, endHelp } from '@/lib/actions/people';

export default async function TenantHelp() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const { data } = await supabase.from('domestic_help').select('*').eq('tenancy_id', tenancy.id).order('active', { ascending: false }).order('start_date');
  return (
    <>
      <PageHeader title={t('help.title')} subtitle={t('help.idHint')} />
      <div className="space-y-6">
        {!data?.length ? (
          <Empty>{t('help.empty')}</Empty>
        ) : (
          <List>
            {data.map((h) => (
              <ListRow key={h.id} right={h.active && (
                <form action={endHelp}><input type="hidden" name="id" value={h.id} /><Button size="sm" variant="ghost">{t('help.stopped')}</Button></form>
              )}>
                <div className={h.active ? 'font-medium' : 'text-muted line-through'}>{h.name}</div>
                <div className="text-xs text-muted">{t(`help.roles.${h.role}`)}{h.phone && ` · ${h.phone}`}</div>
              </ListRow>
            ))}
          </List>
        )}
        <Section title={t('help.add')}>
          <Card>
            <ActionForm action={addHelp} hidden={{ tenancy_id: tenancy.id }} resetOnSuccess>
              <div className="grid grid-cols-2 gap-3">
                <Field name="name" label={t('occupants.name')}><Input name="name" /></Field>
                <Field name="role" label={t('help.role')}>
                  <Select name="role" options={['maid', 'cook', 'driver', 'caretaker', 'other'].map((r) => ({ value: r, label: t(`help.roles.${r}`) }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="phone" label={t('occupants.phone')} optional><Input name="phone" type="tel" /></Field>
                <Field name="start_date" label={t('occupants.startDate')} optional><Input name="start_date" type="date" /></Field>
              </div>
              <Field name="address" label={t('properties.address')} optional><Input name="address" /></Field>
              <Field name="photo" label={t('common.photo')} optional><FileInput name="photo" /></Field>
              <SubmitButton variant="secondary">{t('common.add')}</SubmitButton>
            </ActionForm>
          </Card>
        </Section>
        <p className="text-xs text-muted">{t('help.idHint')}</p>
      </div>
    </>
  );
}
