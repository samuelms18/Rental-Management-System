import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import type { Tables } from '@fpm/types';
import { Button } from '@/components/ui/button';
import { Card, Empty, List, ListRow } from '@/components/ui/card';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { addOccupant, endOccupant } from '@/lib/actions/tenancy';

export async function OccupantsSection({ tenancyId, occupants, canEdit }: { tenancyId: string; occupants: Tables<'occupants'>[]; canEdit: boolean }) {
  const t = await getTranslations();
  const locale = await getLocale();
  const current = occupants.filter((o) => !o.end_date);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{t('occupants.current', { count: current.length })}</p>
      {occupants.length === 0 ? (
        <Empty>{t('occupants.empty')}</Empty>
      ) : (
        <List>
          {occupants.map((o) => (
            <ListRow
              key={o.id}
              right={
                canEdit && !o.end_date ? (
                  <form action={endOccupant}>
                    <input type="hidden" name="id" value={o.id} />
                    <Button size="sm" variant="ghost">{t('occupants.end')}</Button>
                  </form>
                ) : o.end_date ? <span className="text-xs text-muted">{formatDate(o.end_date, locale)}</span> : null
              }
            >
              <div className={o.end_date ? 'text-muted line-through' : 'font-medium'}>{o.name}</div>
              <div className="text-xs text-muted">{[o.relationship, o.age ? `${o.age}` : null, o.phone].filter(Boolean).join(' · ')}</div>
            </ListRow>
          ))}
        </List>
      )}
      {canEdit && (
        <details>
          <summary className="min-h-11 cursor-pointer py-2 text-sm text-primary">{t('occupants.add')}</summary>
          <Card>
            <ActionForm action={addOccupant} hidden={{ tenancy_id: tenancyId }} resetOnSuccess>
              <Field name="name" label={t('occupants.name')}>
                <Input name="name" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field name="relationship" label={t('occupants.relationship')} optional>
                  <Input name="relationship" />
                </Field>
                <Field name="age" label={t('occupants.age')} optional>
                  <Input name="age" type="number" min={0} max={120} inputMode="numeric" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="phone" label={t('occupants.phone')} optional>
                  <Input name="phone" type="tel" inputMode="tel" />
                </Field>
                <Field name="start_date" label={t('occupants.startDate')} optional>
                  <Input name="start_date" type="date" />
                </Field>
              </div>
              <SubmitButton variant="secondary">{t('common.add')}</SubmitButton>
            </ActionForm>
          </Card>
        </details>
      )}
    </div>
  );
}
