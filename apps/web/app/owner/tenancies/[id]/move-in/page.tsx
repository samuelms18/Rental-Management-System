import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { CheckCircle2, Circle } from 'lucide-react';
import { formatDate, paiseToRupeesInput, todayIST } from '@fpm/api';
import { PHOTO_AREAS } from '@fpm/validation';
import { Card, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { PhotoGrid } from '@/components/photo-grid';
import { TenancyPhotoForm } from '@/components/tenancy-photo-form';
import { MeterForm } from '@/components/meter-form';
import { requireStaff } from '@/lib/auth';
import { completeMoveIn, saveAdvance } from '@/lib/actions/move';

export default async function MoveIn({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data: ty } = await supabase.from('tenancies').select('*, houses(unit_number), tenants(id, full_name, user_id)').eq('id', id).maybeSingle();
  if (!ty || !ty.tenants) notFound();
  const [{ data: rec }, { count: occ }, { count: docs }, { data: consent }, { data: agreements }, { data: photos }, { data: readings }] = await Promise.all([
    supabase.from('move_in_records').select('*').eq('tenancy_id', id).maybeSingle(),
    supabase.from('occupants').select('id', { count: 'exact', head: true }).eq('tenancy_id', id),
    supabase.from('identity_documents').select('id', { count: 'exact', head: true }).eq('tenancy_id', id).eq('owner_type', 'tenant'),
    supabase.from('consents').select('id').eq('tenant_id', ty.tenants.id).limit(1).maybeSingle(),
    supabase.from('agreements').select('status').eq('tenancy_id', id),
    supabase.from('tenancy_photos').select('area, path').eq('tenancy_id', id).eq('stage', 'move_in'),
    supabase.from('meter_readings').select('reading, read_on').eq('tenancy_id', id).eq('stage', 'move_in').order('created_at', { ascending: false }).limit(1),
  ]);
  const agreementDone = !!ty.offline_agreement_path || (agreements ?? []).some((a) => ['approved', 'active'].includes(a.status));
  const steps: Array<[string, boolean, string?]> = [
    [t('moveIn.stepTenant'), true],
    [t('moveIn.stepTenancy'), true],
    [t('moveIn.stepOccupants'), (occ ?? 0) > 0, t('common.optional')],
    [t('moveIn.stepDocuments'), !!consent && (docs ?? 0) > 0],
    [t('moveIn.stepAgreement'), agreementDone],
    [t('moveIn.stepAdvance'), rec?.advance_received_paise != null],
    [t('moveIn.stepPhotos'), (photos ?? []).length > 0],
    [t('moveIn.stepMeter'), (readings ?? []).length > 0],
    [t('moveIn.stepActive'), ['active', 'notice_period', 'completed'].includes(ty.status)],
  ];

  return (
    <>
      <PageHeader title={t('moveIn.title')} subtitle={`${ty.houses?.unit_number} · ${ty.tenants.full_name}`} back={`/owner/tenancies/${id}`} />
      <div className="space-y-6">
        <Card>
          <ol className="space-y-2">
            {steps.map(([label, done, note], i) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                {done ? <CheckCircle2 className="size-5 text-ok" /> : <Circle className="size-5 text-muted" />}
                <span className={done ? '' : 'font-medium'}>{i + 1}. {label}</span>
                {note && !done && <span className="text-xs text-muted">({note})</span>}
              </li>
            ))}
          </ol>
          {rec?.completed_at && <p className="mt-3 text-sm text-ok">{t('moveIn.completedOn', { date: formatDate(rec.completed_at, locale) })}</p>}
        </Card>

        <Section title={t('moveIn.advance')}>
          <Card>
            <ActionForm action={saveAdvance} hidden={{ tenancy_id: id }}>
              <div className="grid grid-cols-2 gap-3">
                <Field name="advance_received_paise" label={t('common.amount')}>
                  <MoneyInput name="advance_received_paise" defaultValue={paiseToRupeesInput(rec?.advance_received_paise ?? ty.advance_paise)} />
                </Field>
                <Field name="advance_received_on" label={t('common.date')}>
                  <Input name="advance_received_on" type="date" defaultValue={rec?.advance_received_on ?? todayIST()} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field name="advance_method" label={t('pay.method')}>
                  <Select name="advance_method" defaultValue={rec?.advance_method ?? 'bank_transfer'} options={['bank_transfer', 'upi', 'cash', 'other'].map((m) => ({ value: m, label: t(`labels.method.${m}`) }))} />
                </Field>
                <Field name="advance_reference" label={t('pay.utr')} optional>
                  <Input name="advance_reference" defaultValue={rec?.advance_reference ?? ''} />
                </Field>
              </div>
              <SubmitButton variant="secondary">{t('common.save')}</SubmitButton>
            </ActionForm>
          </Card>
        </Section>

        <Section title={t('moveIn.meter')}>
          {readings?.[0] && <p className="text-sm">{readings[0].reading} · {formatDate(readings[0].read_on, locale)}</p>}
          <Card><MeterForm tenancyId={id} stage="move_in" /></Card>
        </Section>

        <Section title={t('moveIn.photos')}>
          {PHOTO_AREAS.map((area) => {
            const list = (photos ?? []).filter((p) => p.area === area);
            return list.length ? (
              <div key={area} className="space-y-1">
                <h3 className="text-sm text-muted">{t(`labels.photoArea.${area}`)}</h3>
                <PhotoGrid bucket="tenancy-photos" paths={list.map((p) => p.path)} />
              </div>
            ) : null;
          })}
          <Card><TenancyPhotoForm tenancyId={id} stage="move_in" /></Card>
        </Section>

        {!rec?.completed_at && (
          <ActionForm action={completeMoveIn} hidden={{ tenancy_id: id }}>
            <SubmitButton>{t('moveIn.complete')}</SubmitButton>
          </ActionForm>
        )}
      </div>
    </>
  );
}
