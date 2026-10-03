import { getTranslations } from 'next-intl/server';
import { COMPLAINT_CATEGORIES } from '@fpm/validation';
import { Card, Empty } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { PageHeader } from '@/components/ui/page-header';
import { requireTenant } from '@/lib/auth';
import { raiseComplaint } from '@/lib/actions/complaints';

export default async function NewComplaint() {
  const { tenancy } = await requireTenant();
  const t = await getTranslations();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  return (
    <>
      <PageHeader title={t('complaints.new')} back="/tenant/complaints" />
      <Card>
        <ActionForm action={raiseComplaint} hidden={{ tenancy_id: tenancy.id, back: '/tenant/complaints' }}>
          <Field name="category" label={t('complaints.category')}>
            <Select name="category" options={COMPLAINT_CATEGORIES.map((c) => ({ value: c, label: t(`labels.complaintCategory.${c}`) }))} />
          </Field>
          <Field name="title" label={t('complaints.titleLabel')}>
            <Input name="title" maxLength={140} />
          </Field>
          <Field name="description" label={t('complaints.description')} optional>
            <Textarea name="description" rows={4} />
          </Field>
          <Field name="priority" label={t('complaints.priority')}>
            <Select name="priority" defaultValue="normal" options={['low', 'normal', 'urgent'].map((p) => ({ value: p, label: t(`labels.priority.${p}`) }))} />
          </Field>
          <Field name="media" label={t('complaints.media')} hint={t('complaints.mediaHint')} optional>
            <FileInput name="media" accept="image/*,video/mp4" multiple />
          </Field>
          <SubmitButton className="w-full sm:w-full">{t('common.submit')}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
