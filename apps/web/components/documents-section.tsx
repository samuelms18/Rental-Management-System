import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, maskedId } from '@fpm/api';
import { DOC_TYPES } from '@fpm/validation';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, Empty, List, ListRow } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { IdNumberInput } from '@/components/id-number-input';
import { uploadDocument, verifyDocument } from '@/lib/actions/tenancy';
import { fileUrl } from '@/lib/file-url';

type Doc = {
  id: string; owner_type: string; owner_id: string; doc_type: string; number_last4: string | null; front_path: string | null;
  back_path: string | null; verification: string; rejection_reason: string | null; expiry_date: string | null; created_at: string;
};

export async function DocumentsSection({
  tenancyId,
  tenant,
  occupants,
  docs,
  canUpload,
  staff,
}: {
  tenancyId: string;
  tenant: { id: string; full_name: string };
  occupants: Array<{ id: string; name: string }>;
  docs: Doc[];
  canUpload: boolean;
  staff: boolean;
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  const owners = [{ id: tenant.id, name: tenant.full_name, type: 'tenant' }, ...occupants.map((o) => ({ ...o, type: 'occupant' }))];
  const ownerName = (d: Doc) => owners.find((o) => o.id === d.owner_id)?.name ?? '';

  return (
    <div className="space-y-4">
      {docs.length === 0 ? (
        <Empty>{t('documents.empty')}</Empty>
      ) : (
        <List>
          {docs.map((d) => (
            <ListRow key={d.id} right={<Badge tone={toneFor(d.verification)}>{t(`status.doc.${d.verification}`)}</Badge>}>
              <div className="font-medium">{ownerName(d)} · {t(`labels.docType.${d.doc_type}`)}</div>
              <div className="font-mono text-xs text-muted">{maskedId(d.number_last4)} · {formatDate(d.created_at, locale)}</div>
              <div className="mt-1 flex flex-wrap gap-3 text-sm">
                {d.front_path && <a className="text-primary" href={fileUrl('identity-docs', d.front_path)!} target="_blank" rel="noreferrer">{t('documents.front')}</a>}
                {d.back_path && <a className="text-primary" href={fileUrl('identity-docs', d.back_path)!} target="_blank" rel="noreferrer">{t('documents.back')}</a>}
              </div>
              {d.verification === 'rejected' && d.rejection_reason && <p className="mt-1 text-xs text-danger">{t('documents.rejected', { reason: d.rejection_reason })}</p>}
              {staff && d.verification === 'pending' && (
                <ActionForm action={verifyDocument} hidden={{ id: d.id }} className="mt-2 flex flex-wrap items-end gap-2 space-y-0">
                  <Input name="rejection_reason" placeholder={t('common.reason')} className="min-w-40 flex-1" />
                  <SubmitButton variant="secondary" name="verification" value="verified">{t('documents.verify')}</SubmitButton>
                  <SubmitButton variant="ghost" name="verification" value="rejected">{t('documents.reject')}</SubmitButton>
                </ActionForm>
              )}
            </ListRow>
          ))}
        </List>
      )}
      {canUpload && (
        <Card>
          <ActionForm action={uploadDocument} hidden={{ tenancy_id: tenancyId }} resetOnSuccess>
            <h3 className="font-medium">{t('documents.add')}</h3>
            <p className="text-xs text-muted">{t('documents.anyIdOk')} {t('documents.maskedAadhaar')}</p>
            <Field name="owner_id" label={t('documents.whose')}>
              <Select name="owner_id" options={owners.map((o) => ({ value: o.id, label: o.name }))} />
            </Field>
            <Field name="doc_type" label={t('documents.type')}>
              <Select name="doc_type" options={DOC_TYPES.map((d) => ({ value: d, label: t(`labels.docType.${d}`) }))} />
            </Field>
            <Field name="number_last4" label={t('documents.number')} hint={t('documents.numberHint')} optional>
              <IdNumberInput />
            </Field>
            <Field name="front" label={t('documents.front')}>
              <FileInput name="front" accept="image/*,application/pdf" />
            </Field>
            <Field name="back" label={t('documents.backOptional')}>
              <FileInput name="back" accept="image/*,application/pdf" />
            </Field>
            <Field name="expiry_date" label={t('documents.expiry')} optional>
              <Input name="expiry_date" type="date" />
            </Field>
            <SubmitButton>{t('common.upload')}</SubmitButton>
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
