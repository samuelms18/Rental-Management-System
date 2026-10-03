import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, DefList, Empty } from '@/components/ui/card';
import { ActionForm, Checkbox, Field, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { SignaturePad } from '@/components/signature-pad';
import { requireTenant } from '@/lib/auth';
import { markAgreementViewed, signAgreement } from '@/lib/actions/agreements';
import { fileUrl } from '@/lib/file-url';

export default async function TenantAgreement() {
  const { supabase, tenancy } = await requireTenant();
  const t = await getTranslations();
  const locale = await getLocale();
  if (!tenancy) return <Empty>{t('tenantHome.noTenancy')}</Empty>;
  const { data: a } = await supabase.from('agreements').select('*').eq('tenancy_id', tenancy.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!a) {
    const offline = fileUrl('agreements', tenancy.offline_agreement_path);
    return (
      <>
        <PageHeader title={t('agreements.agreement')} />
        {offline ? <Card><a className="text-primary" href={offline} target="_blank" rel="noreferrer">{t('tenancy.viewAgreement')}</a></Card> : <Empty>{t('agreements.noneYet')}</Empty>}
      </>
    );
  }
  if (a.status === 'sent') await markAgreementViewed(a.id);
  const { data: v } = await supabase.from('agreement_versions').select('*').eq('id', a.current_version_id ?? '').maybeSingle();
  const canSign = ['sent', 'awaiting_signature'].includes(a.status);
  const stamped = fileUrl('agreements', a.final_stamped_path);

  return (
    <>
      <PageHeader title={t('agreements.agreement')} subtitle={<Badge tone={toneFor(a.status === 'sent' ? 'awaiting_signature' : a.status)}>{t(`status.agreement.${a.status === 'sent' ? 'awaiting_signature' : a.status}`)}</Badge>} />
      <div className="space-y-6">
        <Card className="space-y-3">
          <DefList items={[
            [t('tenancy.startDate'), formatDate(a.start_date, locale)],
            [t('tenancy.endDate'), formatDate(a.end_date, locale)],
            [t('tenancy.rent'), <Money key="r" paise={a.rent_paise} />],
            [t('tenancy.advance'), <Money key="a" paise={a.advance_paise} />],
          ]} />
          <div className="flex flex-wrap gap-3 text-sm">
            <a className="text-primary" href={`/api/agreements/${a.id}/pdf`} target="_blank" rel="noreferrer">{t('agreements.viewPdf')}</a>
            {stamped && <a className="text-primary" href={stamped} target="_blank" rel="noreferrer">{t('agreements.stampedCopy')}</a>}
          </div>
        </Card>
        {v && (
          <Card>
            <div className="max-h-96 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed">{v.body_text.replace(/\*\*/g, '').replace(/^#+ /gm, '')}</div>
          </Card>
        )}
        {a.status === 'signed' && <p role="status" className="rounded-xl bg-ok-soft p-3 text-sm text-ok">{t('agreements.signedOk')}</p>}
        <p className="rounded-xl bg-info-soft p-3 text-sm text-info">{t('agreements.legalNote')}</p>
        {canSign && (
          <Card>
            <ActionForm action={signAgreement} hidden={{ id: a.id }}>
              <h2 className="font-semibold">{t('agreements.signTitle')}</h2>
              <SignaturePad />
              <details>
                <summary className="cursor-pointer text-sm text-primary">{t('agreements.orUpload')}</summary>
                <div className="mt-2">
                  <Field name="signed_file" label={t('agreements.signedFile')}>
                    <FileInput name="signed_file" accept="image/*,application/pdf" />
                  </Field>
                </div>
              </details>
              <Checkbox name="accept" label={t('agreements.acceptText')} />
              <SubmitButton className="w-full sm:w-full">{t('agreements.sign')}</SubmitButton>
            </ActionForm>
          </Card>
        )}
      </div>
    </>
  );
}
