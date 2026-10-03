import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { ActionForm, Field, Input, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { PageHeader } from '@/components/ui/page-header';
import { ComplaintSummary } from '@/components/complaint-detail';
import { requireTenant } from '@/lib/auth';
import { addComplaintMedia, confirmComplaint, reopenComplaint } from '@/lib/actions/complaints';

export default async function TenantComplaint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireTenant();
  const t = await getTranslations();
  const { data: c } = await supabase.from('complaints').select('*').eq('id', id).maybeSingle();
  if (!c) notFound();
  const [{ data: media }, { data: updates }] = await Promise.all([
    supabase.from('complaint_media').select('*').eq('complaint_id', id).order('created_at'),
    supabase.from('complaint_updates').select('*').eq('complaint_id', id).order('created_at'),
  ]);
  const open = !['tenant_confirmed', 'closed'].includes(c.status);
  return (
    <>
      <PageHeader title={c.title} subtitle={c.code} back="/tenant/complaints" />
      <div className="space-y-6">
        {c.status === 'resolved' && (
          <Card className="space-y-4">
            <p className="text-sm text-muted">{t('complaints.autoClose')}</p>
            <ActionForm action={confirmComplaint} hidden={{ id }}>
              <SubmitButton className="w-full sm:w-full">{t('complaints.confirm')}</SubmitButton>
            </ActionForm>
            {c.reopened_count < 1 && (
              <ActionForm action={reopenComplaint} hidden={{ id }}>
                <Field name="reason" label={t('complaints.reopenReason')}>
                  <Input name="reason" />
                </Field>
                <SubmitButton variant="secondary">{t('complaints.reopen')}</SubmitButton>
              </ActionForm>
            )}
          </Card>
        )}
        <ComplaintSummary c={c} media={media ?? []} updates={updates ?? []} />
        {open && (
          <Card>
            <ActionForm action={addComplaintMedia} hidden={{ id }} resetOnSuccess>
              <Field name="media" label={t('complaints.media')} hint={t('complaints.mediaHint')}>
                <FileInput name="media" accept="image/*,video/mp4" multiple />
              </Field>
              <SubmitButton variant="secondary">{t('common.upload')}</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
