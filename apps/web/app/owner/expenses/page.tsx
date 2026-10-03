import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, todayIST } from '@fpm/api';
import { EXPENSE_CATEGORIES } from '@fpm/validation';
import { Card, Empty, List, ListRow, Section, Stat } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { addExpense } from '@/lib/actions/complaints';
import { fileUrl } from '@/lib/file-url';

export default async function ExpensesPage() {
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ data: properties }, { data: houses }, { data: expenses }] = await Promise.all([
    supabase.from('properties').select('id, name').order('name'),
    supabase.from('houses').select('id, unit_number, property_id').order('unit_number'),
    supabase.from('expenses').select('*, houses(unit_number), properties(name), complaints(code)').order('spent_on', { ascending: false }).limit(100),
  ]);
  const year = todayIST().slice(0, 4);
  const yearTotal = (expenses ?? []).filter((e) => e.spent_on.startsWith(year)).reduce((n, e) => n + e.amount_paise, 0);

  return (
    <>
      <PageHeader title={t('expenses.title')} />
      <div className="space-y-8">
        <Stat label={`${t('expenses.total')} ${year}`} value={<Money paise={yearTotal} />} />
        {!!properties?.length && (
          <Card>
            <ActionForm action={addExpense} resetOnSuccess>
              <h2 className="font-semibold">{t('expenses.add')}</h2>
              <div className="grid grid-cols-2 gap-3">
                <Field name="property_id" label={t('expenses.property')}>
                  <Select name="property_id" options={properties.map((p) => ({ value: p.id, label: p.name }))} />
                </Field>
                <Field name="house_id" label={t('expenses.house')} optional>
                  <Select name="house_id" placeholder={t('expenses.allHouses')} options={(houses ?? []).map((h) => ({ value: h.id, label: `${h.unit_number} · ${properties.find((p) => p.id === h.property_id)?.name ?? ''}` }))} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="category" label={t('expenses.category')}>
                  <Select name="category" options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(`labels.expenseCategory.${c}`) }))} />
                </Field>
                <Field name="amount_paise" label={t('common.amount')}>
                  <MoneyInput name="amount_paise" />
                </Field>
              </div>
              <Field name="spent_on" label={t('expenses.spentOn')}>
                <Input name="spent_on" type="date" defaultValue={todayIST()} />
              </Field>
              <Field name="description" label={t('expenses.description')}>
                <Input name="description" />
              </Field>
              <Field name="receipt" label={t('expenses.receipt')} optional>
                <FileInput name="receipt" accept="image/*,application/pdf" />
              </Field>
              <Field name="notes" label={t('common.notes')} optional>
                <Textarea name="notes" />
              </Field>
              <SubmitButton>{t('common.save')}</SubmitButton>
            </ActionForm>
          </Card>
        )}
        <Section title={t('expenses.title')}>
          {!expenses?.length ? (
            <Empty>{t('expenses.empty')}</Empty>
          ) : (
            <List>
              {expenses.map((e) => (
                <ListRow key={e.id} right={<Money paise={e.amount_paise} className="font-semibold" />}>
                  <div className="font-medium">{e.description}</div>
                  <div className="text-xs text-muted">
                    {t(`labels.expenseCategory.${e.category}`)} · {e.houses?.unit_number ?? e.properties?.name} · {formatDate(e.spent_on, locale)}
                    {e.complaints?.code && ` · ${e.complaints.code}`}
                  </div>
                  {e.receipt_path && <a className="text-xs text-primary" href={fileUrl('expense-receipts', e.receipt_path)!} target="_blank" rel="noreferrer">{t('expenses.receipt')}</a>}
                </ListRow>
              ))}
            </List>
          )}
        </Section>
      </div>
    </>
  );
}
