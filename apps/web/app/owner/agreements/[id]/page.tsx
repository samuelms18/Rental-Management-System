import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, whatsappLink } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Card, DefList, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, SubmitButton, Textarea } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import {
  approveAgreement, editAgreementText, generateAgreementPdf, sendAgreement, terminateAgreement, uploadStampedCopy,
} from '@/lib/actions/agreements';
import { env } from '@/lib/env';
import { fileUrl } from '@/lib/file-url';
import { getTranslations as getT } from 'next-intl/server';
import { isLocale } from '@fpm/i18n';

export default async function AgreementDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data: a } = await supabase
    .from('agreements')
    .select('*, tenancies(id, code, status, tenants(full_name, phone, user_id), houses(unit_number))')
    .eq('id', id)
    .maybeSingle();
  if (!a || !a.tenancies) notFound();
  const [{ data: versions }, { data: current }] = await Promise.all([
    supabase.from('agreement_versions').select('id, version_no, created_at, rendered_pdf_path, signatures(signer_role, method, signed_at, image_path)').eq('agreement_id', id).order('version_no', { ascending: false }),
    supabase.from('agreement_versions').select('*').eq('id', a.current_version_id ?? '').maybeSingle(),
  ]);
  const ty = a.tenancies;
  const editable = ['draft', 'generated', 'sent', 'awaiting_signature', 'signed'].includes(a.status);
  let waLink: string | null = null;
  if (ty.tenants?.phone && ['sent', 'awaiting_signature'].includes(a.status)) {
    const { data: prof } = await supabase.from('profiles').select('preferred_language').eq('id', ty.tenants.user_id ?? '').maybeSingle();
    const lang = isLocale(prof?.preferred_language) ? prof!.preferred_language : 'en';
    const tw = await getT({ locale: lang, namespace: 'whatsapp' });
    waLink = whatsappLink(ty.tenants.phone, tw('agreement', { name: ty.tenants.full_name, house: ty.houses?.unit_number ?? '', link: `${env.siteUrl()}/tenant/agreement` }));
  }
  const stamped = fileUrl('agreements', a.final_stamped_path);

  return (
    <>
      <PageHeader
        title={`${t('agreements.agreement')} · ${ty.houses?.unit_number}`}
        subtitle={<span className="flex flex-wrap items-center gap-2">{ty.tenants?.full_name} <Badge tone={toneFor(a.status)}>{t(`status.agreement.${a.status}`)}</Badge></span>}
        back={`/owner/tenancies/${ty.id}`}
      />
      <div className="space-y-6">
        <Card className="space-y-3">
          <DefList items={[
            [t('tenancy.startDate'), formatDate(a.start_date, locale)],
            [t('tenancy.endDate'), formatDate(a.end_date, locale)],
            [t('tenancy.rent'), <Money key="r" paise={a.rent_paise} />],
            [t('tenancy.advance'), <Money key="a" paise={a.advance_paise} />],
            [t('agreements.version'), current ? `v${current.version_no}` : '—'],
          ]} />
          <div className="flex flex-wrap gap-3 text-sm">
            <a className="text-primary" href={`/api/agreements/${id}/pdf`} target="_blank" rel="noreferrer">{t('agreements.viewPdf')}</a>
            {stamped && <a className="text-primary" href={stamped} target="_blank" rel="noreferrer">{t('agreements.stampedCopy')}</a>}
          </div>
          <p className="text-xs text-muted">{t('agreements.legalNote')}</p>
        </Card>

        {/* Next step */}
        <Card className="space-y-3">
          {a.status === 'draft' && (
            <ActionForm action={generateAgreementPdf} hidden={{ id }}>
              <p className="text-sm text-muted">{t('agreements.step.generate')}</p>
              <SubmitButton>{t('agreements.generate')}</SubmitButton>
            </ActionForm>
          )}
          {a.status === 'generated' && (
            <ActionForm action={sendAgreement} hidden={{ id }}>
              <p className="text-sm text-muted">{t('agreements.step.send')}</p>
              <SubmitButton>{t('agreements.send')}</SubmitButton>
            </ActionForm>
          )}
          {['sent', 'awaiting_signature'].includes(a.status) && (
            <div className="space-y-3">
              <p className="text-sm text-muted">{t('agreements.step.waiting')}</p>
              {waLink && <LinkButton href={waLink} external variant="whatsapp" size="sm">{t('agreements.shareWhatsapp')}</LinkButton>}
            </div>
          )}
          {a.status === 'signed' && (
            <ActionForm action={approveAgreement} hidden={{ id }}>
              <p className="text-sm text-muted">{t('agreements.step.approve')}</p>
              <SubmitButton>{t('agreements.approve')}</SubmitButton>
            </ActionForm>
          )}
          {['approved', 'active'].includes(a.status) && (
            <ActionForm action={uploadStampedCopy} hidden={{ id }}>
              <p className="text-sm text-muted">{t('agreements.step.stamped')}</p>
              <Field name="stamped" label={t('agreements.stampedCopy')}>
                <FileInput name="stamped" accept="image/*,application/pdf" />
              </Field>
              <SubmitButton variant={stamped ? 'secondary' : 'primary'}>{t('common.upload')}</SubmitButton>
            </ActionForm>
          )}
          {['active', 'expired'].includes(a.status) && (
            <LinkButton href={`/owner/agreements/new?tenancy=${ty.id}&renew=${id}`} variant="secondary">{t('agreements.renew')}</LinkButton>
          )}
        </Card>

        {editable && current && (
          <Section title={t('agreements.editText')}>
            <Card>
              <ActionForm action={editAgreementText} hidden={{ id }}>
                <p className="text-xs text-muted">{t('agreements.editWarning')}</p>
                <Field name="body_text" label={`v${current.version_no}`}>
                  <Textarea name="body_text" rows={18} defaultValue={current.body_text} className="font-mono text-sm" />
                </Field>
                <SubmitButton variant="secondary">{t('agreements.saveVersion')}</SubmitButton>
              </ActionForm>
            </Card>
          </Section>
        )}

        <Section title={t('agreements.versions')}>
          <List>
            {(versions ?? []).map((v) => (
              <ListRow key={v.id} right={v.rendered_pdf_path && <a className="text-sm text-primary" href={fileUrl('agreements', v.rendered_pdf_path)!} target="_blank" rel="noreferrer">PDF</a>}>
                <div className="font-medium">v{v.version_no} · {formatDate(v.created_at, locale)}</div>
                {v.signatures.map((s, i) => (
                  <div key={i} className="text-xs text-muted">
                    {t('agreements.signedBy', { role: t(`profile.roles.${s.signer_role}`) })} · {formatDate(s.signed_at, locale)} ·{' '}
                    <a className="text-primary" href={fileUrl('agreements', s.image_path)!} target="_blank" rel="noreferrer">{t(s.method === 'drawn' ? 'agreements.drawn' : 'agreements.uploaded')}</a>
                  </div>
                ))}
              </ListRow>
            ))}
          </List>
        </Section>

        {!['expired', 'terminated'].includes(a.status) && (
          <details>
            <summary className="min-h-11 cursor-pointer py-2 text-sm text-danger">{t('agreements.terminate')}</summary>
            <Card>
              <ActionForm action={terminateAgreement} hidden={{ id }}>
                <Field name="reason" label={t('common.reason')}><Input name="reason" /></Field>
                <SubmitButton variant="danger">{t('agreements.terminate')}</SubmitButton>
              </ActionForm>
            </Card>
          </details>
        )}
        {a.terminated_reason && <p className="text-sm text-muted">{a.terminated_reason}</p>}
        <p className="text-xs text-muted"><Link className="text-primary" href={`/owner/tenancies/${ty.id}`}>{ty.code}</Link></p>
      </div>
    </>
  );
}
