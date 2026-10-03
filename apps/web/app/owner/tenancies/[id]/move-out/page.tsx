import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, formatINR, paiseToRupeesInput, todayIST, whatsappLink } from '@fpm/api';
import { isLocale } from '@fpm/i18n';
import { PHOTO_AREAS } from '@fpm/validation';
import { Badge, toneFor } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, List, ListRow, Section, Stat } from '@/components/ui/card';
import { ActionForm, Field, Input, MoneyInput, Select, SubmitButton, Textarea } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { PhotoGrid } from '@/components/photo-grid';
import { TenancyPhotoForm } from '@/components/tenancy-photo-form';
import { MeterForm } from '@/components/meter-form';
import { requireStaff } from '@/lib/auth';
import {
  addAdvanceReceived, addDeduction, removeDeduction, reopenSettlement, saveMoveOut, settleMoveOut, shareSettlement,
} from '@/lib/actions/move';
import { settlementLines } from '@/lib/settlement';
import { openCharges } from '@/lib/tenant-dues';
import { env } from '@/lib/env';
import { getTranslations as getT } from 'next-intl/server';

export default async function MoveOut({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data: ty } = await supabase.from('tenancies').select('*, houses(id, unit_number), tenants(full_name, phone, user_id)').eq('id', id).maybeSingle();
  if (!ty || !ty.tenants || !ty.houses) notFound();
  const [{ data: mo }, { data: photos }, { data: readings }, { data: lastBill }, settlement, dues] = await Promise.all([
    supabase.from('move_out_records').select('*').eq('tenancy_id', id).maybeSingle(),
    supabase.from('tenancy_photos').select('area, path, stage').eq('tenancy_id', id),
    supabase.from('meter_readings').select('id, reading, read_on, stage').eq('house_id', ty.houses.id).order('read_on').order('created_at'),
    supabase.from('eb_bills').select('amount_paise, units').eq('house_id', ty.houses.id).not('units', 'is', null).gt('units', 0).order('period_end', { ascending: false }).limit(1).maybeSingle(),
    settlementLines(supabase, id),
    openCharges(supabase, id),
  ]);
  const draft = !mo || mo.status === 'draft';
  const outReading = (readings ?? []).filter((r) => r.stage === 'move_out').at(-1);
  const prevReading = outReading ? (readings ?? []).filter((r) => r.id !== outReading.id && r.read_on <= outReading.read_on).at(-1) : undefined;
  const units = outReading && prevReading ? Number(outReading.reading) - Number(prevReading.reading) : null;
  const rate = lastBill ? Math.round(lastBill.amount_paise / Number(lastBill.units)) : null;
  const suggestedEb = units != null && rate != null ? Math.round((units * rate) / 100) * 100 : null;
  const outstanding = dues.reduce((n, c) => n + c.outstanding_paise, 0) + (draft ? (mo?.final_eb_paise ?? 0) : 0);
  const projected = draft ? Math.max(settlement.balance - outstanding, 0) : Math.max(settlement.balance, 0);
  const hasReceived = settlement.lines.some((l) => l.type === 'received');

  let wa: string | null = null;
  if (mo && mo.status !== 'draft' && ty.tenants.phone) {
    const { data: prof } = await supabase.from('profiles').select('preferred_language').eq('id', ty.tenants.user_id ?? '').maybeSingle();
    const tw = await getT({ locale: isLocale(prof?.preferred_language) ? prof!.preferred_language : 'en', namespace: 'whatsapp' });
    wa = whatsappLink(ty.tenants.phone, tw('settlement', { name: ty.tenants.full_name, amount: formatINR(mo.status === 'settled' ? settlement.refunded : projected), link: `${env.siteUrl()}/tenant/settlement` }));
  }

  return (
    <>
      <PageHeader
        title={t('moveOut.title')}
        subtitle={<span className="flex flex-wrap items-center gap-2">{ty.houses.unit_number} · {ty.tenants.full_name} {mo && <Badge tone={toneFor(mo.status)}>{t(`status.settlement.${mo.status}`)}</Badge>}</span>}
        back={`/owner/tenancies/${id}`}
      />
      <div className="space-y-7">
        <Section title={t('moveOut.details')}>
          <Card>
            <ActionForm action={saveMoveOut} hidden={{ tenancy_id: id }}>
              <div className="grid grid-cols-2 gap-3">
                <Field name="notice_date" label={t('moveOut.noticeDate')} optional>
                  <Input name="notice_date" type="date" defaultValue={mo?.notice_date ?? ''} disabled={!draft} />
                </Field>
                <Field name="move_out_date" label={t('tenancy.moveOutDate')}>
                  <Input name="move_out_date" type="date" defaultValue={mo?.move_out_date ?? ty.actual_end_date ?? todayIST()} disabled={!draft} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field name="eb_units" label={t('eb.units')} optional>
                  <Input name="eb_units" inputMode="decimal" defaultValue={mo?.eb_units ?? units ?? ''} disabled={!draft} />
                </Field>
                <Field name="eb_rate_paise" label={t('moveOut.ratePerUnit')} optional>
                  <MoneyInput name="eb_rate_paise" defaultValue={paiseToRupeesInput(mo?.eb_rate_paise ?? rate)} disabled={!draft} />
                </Field>
                <Field name="final_eb_paise" label={t('moveOut.finalEb')}>
                  <MoneyInput name="final_eb_paise" defaultValue={paiseToRupeesInput(mo?.final_eb_paise ?? suggestedEb ?? 0)} disabled={!draft} />
                </Field>
              </div>
              {suggestedEb != null && <p className="text-xs text-muted">{t('moveOut.ebSuggestion', { units: units ?? 0, amount: formatINR(suggestedEb) })}</p>}
              <Field name="inspection_notes" label={t('moveOut.inspection')} optional>
                <Textarea name="inspection_notes" defaultValue={mo?.inspection_notes ?? ''} disabled={!draft} />
              </Field>
              {draft && <SubmitButton variant="secondary">{t('common.save')}</SubmitButton>}
            </ActionForm>
          </Card>
        </Section>

        <Section title={t('moveOut.meter')}>
          {(readings ?? []).length > 0 && (
            <List>
              {readings!.slice(-4).map((r) => (
                <ListRow key={r.id} right={<span className="text-xs text-muted">{t(`moveIn.stage.${r.stage}`)}</span>}>
                  {r.reading} · {formatDate(r.read_on, locale)}
                </ListRow>
              ))}
            </List>
          )}
          {draft && <Card><MeterForm tenancyId={id} stage="move_out" /></Card>}
        </Section>

        <Section title={t('moveOut.photos')}>
          {PHOTO_AREAS.map((area) => {
            const before = (photos ?? []).filter((p) => p.area === area && p.stage === 'move_in').map((p) => p.path);
            const after = (photos ?? []).filter((p) => p.area === area && p.stage === 'move_out').map((p) => p.path);
            if (!before.length && !after.length) return null;
            return (
              <div key={area} className="space-y-1">
                <h3 className="text-sm font-medium">{t(`labels.photoArea.${area}`)}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="mb-1 text-xs text-muted">{t('moveOut.atMoveIn')}</div><PhotoGrid bucket="tenancy-photos" paths={before} cols={2} /></div>
                  <div><div className="mb-1 text-xs text-muted">{t('moveOut.atMoveOut')}</div><PhotoGrid bucket="tenancy-photos" paths={after} cols={2} /></div>
                </div>
              </div>
            );
          })}
          {draft && <Card><TenancyPhotoForm tenancyId={id} stage="move_out" /></Card>}
        </Section>

        <Section title={t('moveOut.deposit')}>
          <List>
            {settlement.lines.map((l) => (
              <ListRow
                key={l.id}
                right={
                  <div className="flex items-center gap-2">
                    <span className={l.sign < 0 ? 'text-danger' : ''}>{l.sign < 0 ? '−' : ''}<Money paise={l.amount} /></span>
                    {draft && l.type === 'deduction' && (
                      <form action={removeDeduction}><input type="hidden" name="id" value={l.id} /><Button size="sm" variant="ghost" aria-label={t('common.delete')}>✕</Button></form>
                    )}
                  </div>
                }
              >
                <div className="text-sm">{l.labelKey ? t(l.labelKey) : l.label}</div>
              </ListRow>
            ))}
            {draft && dues.map((c) => (
              <ListRow key={c.id} right={<span className="text-danger">−<Money paise={c.outstanding_paise} /></span>}>
                <div className="text-sm text-muted">{t('moveOut.willOffset')}: {t(`labels.chargeType.${c.type}`)} · {formatDate(c.period_start, locale)}</div>
              </ListRow>
            ))}
            {draft && (mo?.final_eb_paise ?? 0) > 0 && (
              <ListRow right={<span className="text-danger">−<Money paise={mo!.final_eb_paise} /></span>}>
                <div className="text-sm text-muted">{t('moveOut.willOffset')}: {t('moveOut.finalEb')}</div>
              </ListRow>
            )}
          </List>
          <div className="grid grid-cols-2 gap-3">
            <Stat label={mo?.status === 'settled' ? t('moveOut.refunded') : t('moveOut.refund')} value={<Money paise={mo?.status === 'settled' ? settlement.refunded : projected} />} tone="ok" />
            <Stat label={t('moveOut.outstandingAfter')} value={<Money paise={Math.max(outstanding - settlement.balance, 0)} />} tone={outstanding > settlement.balance && draft ? 'danger' : undefined} />
          </div>
          {draft && !hasReceived && (
            <Card>
              <ActionForm action={addAdvanceReceived} hidden={{ tenancy_id: id }}>
                <p className="text-sm text-muted">{t('moveOut.noAdvance')}</p>
                <Field name="amount_paise" label={t('moveOut.advanceReceived')}>
                  <MoneyInput name="amount_paise" defaultValue={paiseToRupeesInput(ty.advance_paise)} />
                </Field>
                <SubmitButton variant="secondary">{t('common.save')}</SubmitButton>
              </ActionForm>
            </Card>
          )}
          {draft && (
            <Card>
              <ActionForm action={addDeduction} hidden={{ tenancy_id: id }} resetOnSuccess>
                <h3 className="font-medium">{t('moveOut.addDeduction')}</h3>
                <p className="text-xs text-muted">{t('moveOut.deductionHint')}</p>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="reason" label={t('common.reason')}><Input name="reason" /></Field>
                  <Field name="amount_paise" label={t('common.amount')}><MoneyInput name="amount_paise" /></Field>
                </div>
                <Field name="photo" label={t('common.photo')} optional><FileInput name="photo" capture /></Field>
                <SubmitButton variant="secondary">{t('common.add')}</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </Section>

        <Card className="space-y-4">
          {mo && <a className="text-sm text-primary" href={`/api/settlement/${id}`} target="_blank" rel="noreferrer">{t('moveOut.statementPdf')}</a>}
          {mo?.tenant_note && <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{t('moveOut.tenantNote')}: {mo.tenant_note}</p>}
          {draft && mo && (
            <ActionForm action={shareSettlement} hidden={{ tenancy_id: id }}>
              <p className="text-sm text-muted">{t('moveOut.shareHelp')}</p>
              <SubmitButton>{t('moveOut.share')}</SubmitButton>
            </ActionForm>
          )}
          {mo && ['shared_with_tenant', 'acknowledged', 'disputed'].includes(mo.status) && (
            <>
              {wa && <LinkButton href={wa} external variant="whatsapp" size="sm">{t('moveOut.whatsapp')}</LinkButton>}
              <ActionForm action={settleMoveOut} hidden={{ tenancy_id: id }}>
                <h3 className="font-medium">{t('moveOut.settle')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field name="refund_date" label={t('common.date')}><Input name="refund_date" type="date" defaultValue={todayIST()} /></Field>
                  <Field name="refund_method" label={t('pay.method')}>
                    <Select name="refund_method" options={['bank_transfer', 'upi', 'cash', 'other'].map((m) => ({ value: m, label: t(`labels.method.${m}`) }))} />
                  </Field>
                </div>
                <Field name="refund_reference" label={t('pay.utr')} optional><Input name="refund_reference" /></Field>
                <p className="text-xs text-muted">{t('moveOut.settleHelp')}</p>
                <SubmitButton confirm={t('moveOut.settleHelp')}>{t('moveOut.settle')}</SubmitButton>
              </ActionForm>
              <ActionForm action={reopenSettlement} hidden={{ tenancy_id: id }}>
                <SubmitButton variant="ghost">{t('moveOut.reopen')}</SubmitButton>
              </ActionForm>
            </>
          )}
          {mo?.status === 'settled' && (
            <p className="text-sm text-ok">{t('moveOut.settledOn', { date: formatDate(mo.settled_at, locale) })}</p>
          )}
        </Card>
      </div>
    </>
  );
}
