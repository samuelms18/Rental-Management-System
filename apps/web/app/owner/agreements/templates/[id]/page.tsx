import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Card } from '@/components/ui/card';
import { ActionForm, Checkbox, Field, Input, SubmitButton, Textarea } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { saveTemplate } from '@/lib/actions/agreements';
import { PLACEHOLDERS } from '@/lib/agreement-text';

export default async function TemplateEditor({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const tpl = id === 'new' ? null : (await supabase.from('agreement_templates').select('*').eq('id', id).maybeSingle()).data;
  if (id !== 'new' && !tpl) notFound();
  return (
    <>
      <PageHeader title={tpl?.name ?? t('agreements.newTemplate')} back="/owner/agreements/templates" />
      <Card>
        <ActionForm action={saveTemplate} hidden={{ id: tpl?.id }}>
          <Field name="name" label={t('properties.name')}><Input name="name" defaultValue={tpl?.name} /></Field>
          <Field name="body_markdown" label={t('agreements.templateText')} hint={`${t('agreements.placeholders')}: ${PLACEHOLDERS.map((p) => `{{${p}}}`).join(' ')}`}>
            <Textarea name="body_markdown" rows={24} defaultValue={tpl?.body_markdown} className="font-mono text-sm" />
          </Field>
          <Field name="reviewed_by_note" label={t('agreements.reviewNote')} optional>
            <Input name="reviewed_by_note" defaultValue={tpl?.reviewed_by_note ?? ''} />
          </Field>
          <Checkbox name="is_active" label={t('agreements.active')} defaultChecked={tpl?.is_active ?? true} />
          <SubmitButton>{t('common.save')}</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
