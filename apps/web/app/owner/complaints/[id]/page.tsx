import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { paiseToRupeesInput } from '@fpm/api';
import { Card } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { ComplaintSummary } from '@/components/complaint-detail';
import { requireStaff } from '@/lib/auth';
import { updateComplaint } from '@/lib/actions/complaints';

const NEXT: Record<string, string[]> = {
  raised: ['acknowledged', 'assigned', 'in_progress', 'resolved'],
  acknowledged: ['assigned', 'in_progress', 'resolved'],
  assigned: ['in_progress', 'resolved'],
  in_progress: ['resolved'],
};

export default async function OwnerComplaint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const { data: c } = await supabase.from('complaints').select('*, tenancies(id, houses(unit_number), tenants(full_name, phone))').eq('id', id).maybeSingle();
  if (!c) notFound();
  const [{ data: media }, { data: updates }] = await Promise.all([
    supabase.from('complaint_media').select('*').eq('complaint_id', id).order('created_at'),
    supabase.from('complaint_updates').select('*').eq('complaint_id', id).order('created_at'),
  ]);
  const next = NEXT[c.status] ?? [];
  return (
    <>
      <PageHeader title={c.title} subtitle={`${c.code} · ${c.tenancies?.houses?.unit_number} · ${c.tenancies?.tenants?.full_name}`} back="/owner/complaints" />
      <div className="space-y-6">
        {next.length > 0 && (
          <Card>
            <ActionForm action={updateComplaint} hidden={{ id }}>
              <Field name="status" label={t('complaints.moveTo')}>
                <Select name="status" options={next.map((s) => ({ value: s, label: t(`status.complaint.${s}`) }))} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field name="assigned_name" label={t('complaints.assignedName')} optional>
                  <Input name="assigned_name" defaultValue={c.assigned_name ?? ''} />
                </Field>
                <Field name="assigned_phone" label={t('complaints.assignedPhone')} optional>
                  <Input name="assigned_phone" type="tel" defaultValue={c.assigned_phone ?? ''} />
                </Field>
              </div>
              <Field name="resolution_note" label={t('complaints.resolution')} optional>
                <Textarea name="resolution_note" defaultValue={c.resolution_note ?? ''} />
              </Field>
              <Field name="resolution_cost_paise" label={t('complaints.cost')} hint={t('complaints.costHint')} optional>
                <MoneyInput name="resolution_cost_paise" defaultValue={paiseToRupeesInput(c.resolution_cost_paise)} />
              </Field>
              <Field name="note" label={t('complaints.note')} optional>
                <Input name="note" />
              </Field>
              <SubmitButton>{t('common.save')}</SubmitButton>
            </ActionForm>
          </Card>
        )}
        <ComplaintSummary c={c} media={media ?? []} updates={updates ?? []} />
      </div>
    </>
  );
}
