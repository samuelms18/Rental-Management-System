import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, todayIST } from '@fpm/api';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, DefList, Empty, List, ListLink, ListRow, Section } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/button';
import { ActionForm, Field, Input, MoneyInput, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { ChargeRow } from '@/components/charge-row';
import { CashForm } from '@/components/cash-form';
import { DocumentsSection } from '@/components/documents-section';
import { OccupantsSection } from '@/components/occupants-section';
import { requireStaff } from '@/lib/auth';
import { activateOffline, addRentRevision, giveNotice, setTenancyStatus } from '@/lib/actions/tenancy';
import { fileUrl } from '@/lib/file-url';

export default async function TenancyDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data: ty } = await supabase
    .from('tenancies')
    .select('*, houses(id, unit_number, properties(name)), tenants(id, full_name, phone, user_id)')
    .eq('id', id)
    .maybeSingle();
  if (!ty || !ty.tenants || !ty.houses) notFound();
  const [{ data: revisions }, { data: charges }, { data: occupants }, { data: docs }, { data: consent }, { data: agreements }] = await Promise.all([
    supabase.from('rent_revisions').select('*').eq('tenancy_id', id).order('effective_from', { ascending: false }),
    supabase.from('charges').select('*, payment_allocations(amount_paise, payments(status))').eq('tenancy_id', id).order('period_start', { ascending: false }).limit(24),
    supabase.from('occupants').select('*').eq('tenancy_id', id).order('start_date'),
    supabase.from('identity_documents').select('*').eq('tenancy_id', id).order('created_at', { ascending: false }),
    supabase.from('consents').select('id').eq('tenant_id', ty.tenants.id).limit(1).maybeSingle(),
    supabase.from('agreements').select('id, status, start_date, end_date').eq('tenancy_id', id).order('created_at', { ascending: false }),
  ]);
  const today = todayIST();
  const currentRent = revisions?.find((r) => r.effective_from <= today) ?? revisions?.[revisions.length - 1];
  const open = ['draft', 'pending_agreement', 'active', 'notice_period'].includes(ty.status);
  const agreement = fileUrl('agreements', ty.offline_agreement_path);

  return (
    <>
      <PageHeader
        title={`${ty.houses.unit_number} · ${ty.tenants.full_name}`}
        subtitle={<span className="flex flex-wrap items-center gap-2">{ty.code} <Badge tone={toneFor(ty.status)}>{t(`status.tenancy.${ty.status}`)}</Badge></span>}
        back={`/owner/houses/${ty.houses.id}`}
      />
      <div className="space-y-8">
        <Card className="space-y-4">
          <DefList
            items={[
              [t('tenancy.tenant'), <Link key="t" className="text-primary" href={`/owner/tenants/${ty.tenants.id}`}>{ty.tenants.full_name}</Link>],
              [t('tenancy.startDate'), formatDate(ty.start_date, locale)],
              [t('tenancy.endDate'), formatDate(ty.expected_end_date, locale) || '—'],
              ...(ty.actual_end_date ? [[t('tenancy.moveOutDate'), formatDate(ty.actual_end_date, locale)] as [string, string]] : []),
              [t('tenancy.rent'), currentRent ? <Money key="r" paise={currentRent.amount_paise} /> : '—'],
              [t('tenancy.advance'), <Money key="a" paise={ty.advance_paise} />],
              [t('tenancy.noticeDays'), ty.notice_period_days],
              [t('tenancy.dueDay'), ty.rent_due_day],
            ]}
          />
          {agreement && <a href={agreement} target="_blank" rel="noreferrer" className="text-sm text-primary">{t('tenancy.viewAgreement')}</a>}
          <div className="flex flex-wrap gap-2 pt-1">
            <LinkButton href={`/owner/tenancies/${id}/move-in`} variant="secondary" size="sm">{t('moveIn.title')}</LinkButton>
            {['active', 'notice_period', 'completed'].includes(ty.status) && (
              <LinkButton href={`/owner/tenancies/${id}/move-out`} variant="secondary" size="sm">{t('moveOut.title')}</LinkButton>
            )}
          </div>
        </Card>

        <Section
          title={t('agreements.title')}
          action={open && !(agreements ?? []).some((x) => !['expired', 'terminated'].includes(x.status)) && (
            <LinkButton href={`/owner/agreements/new?tenancy=${id}`} size="sm">{t('agreements.new')}</LinkButton>
          )}
        >
          {(agreements ?? []).length > 0 ? (
            <List>
              {agreements!.map((x) => (
                <ListLink key={x.id} href={`/owner/agreements/${x.id}`} right={<Badge tone={toneFor(x.status)}>{t(`status.agreement.${x.status}`)}</Badge>}>
                  <div className="text-sm">{formatDate(x.start_date, locale)} – {formatDate(x.end_date, locale)}</div>
                </ListLink>
              ))}
            </List>
          ) : (
            <p className="text-sm text-muted">{t('agreements.noneYet')}</p>
          )}
        </Section>

        {/* Status actions */}
        {(ty.status === 'draft' || ty.status === 'pending_agreement') && (
          <Card className="space-y-4">
            <h2 className="font-semibold">{t('tenancy.activateOffline')}</h2>
            <p className="text-sm text-muted">{t('tenancy.offlineHelp')}</p>
            <ActionForm action={activateOffline} hidden={{ id }}>
              <Field name="agreement" label={t('tenancy.agreementFile')}>
                <FileInput name="agreement" accept="image/*,application/pdf" />
              </Field>
              <SubmitButton>{t('tenancy.activate')}</SubmitButton>
            </ActionForm>
            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              {ty.status === 'draft' && (
                <ActionForm action={setTenancyStatus} hidden={{ id, status: 'pending_agreement' }}>
                  <SubmitButton variant="secondary">{t('tenancy.toPending')}</SubmitButton>
                </ActionForm>
              )}
              <ActionForm action={setTenancyStatus} hidden={{ id, status: 'cancelled' }}>
                <SubmitButton variant="ghost" confirm={t('tenancy.cancel')}>{t('tenancy.cancel')}</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        )}

        {ty.status === 'active' && (
          <Card>
            <ActionForm action={giveNotice} hidden={{ tenancy_id: id }}>
              <h2 className="font-semibold">{t('tenancy.giveNotice')}</h2>
              <Field name="actual_end_date" label={t('tenancy.moveOutDate')}>
                <Input name="actual_end_date" type="date" />
              </Field>
              <SubmitButton variant="secondary">{t('tenancy.giveNotice')}</SubmitButton>
            </ActionForm>
          </Card>
        )}

        {ty.status === 'notice_period' && (
          <Card className="space-y-3">
            <p className="text-sm text-muted">{t('tenancy.completeConfirm')}</p>
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/owner/tenancies/${id}/move-out`}>{t('moveOut.title')}</LinkButton>
              <ActionForm action={setTenancyStatus} hidden={{ id, status: 'active' }}>
                <SubmitButton variant="secondary">{t('tenancy.withdrawNotice')}</SubmitButton>
              </ActionForm>
            </div>
          </Card>
        )}

        <Section title={t('tenancy.charges')}>
          {!charges?.length ? (
            <Empty>{t('rent.noCharges')}</Empty>
          ) : (
            <List>
              {charges.map((c) => (
                <ChargeRow
                  key={c.id}
                  editable={open}
                  c={{ ...c, paid_paise: c.payment_allocations.filter((a) => a.payments?.status === 'approved').reduce((n, a) => n + a.amount_paise, 0) }}
                />
              ))}
            </List>
          )}
          {open && ty.status !== 'draft' && (
            <Card><CashForm tenancyId={id} /></Card>
          )}
        </Section>

        <Section title={t('tenancy.rentHistory')}>
          <List>
            {(revisions ?? []).map((r) => (
              <ListRow key={r.id} right={<Money paise={r.amount_paise} className="font-semibold" />}>
                <div className="font-medium">{formatDate(r.effective_from, locale)}</div>
                {r.reason && <div className="text-xs text-muted">{r.reason}</div>}
              </ListRow>
            ))}
          </List>
          {open && (
            <details>
              <summary className="min-h-11 cursor-pointer py-2 text-sm text-primary">{t('tenancy.addRevision')}</summary>
              <Card>
                <ActionForm action={addRentRevision} hidden={{ tenancy_id: id }} resetOnSuccess>
                  <div className="grid grid-cols-2 gap-3">
                    <Field name="amount_paise" label={t('tenancy.rent')}>
                      <MoneyInput name="amount_paise" />
                    </Field>
                    <Field name="effective_from" label={t('tenancy.effectiveFrom')}>
                      <Input name="effective_from" type="date" />
                    </Field>
                  </div>
                  <Field name="reason" label={t('tenancy.revisionReason')} optional>
                    <Input name="reason" />
                  </Field>
                  <SubmitButton variant="secondary">{t('common.save')}</SubmitButton>
                </ActionForm>
              </Card>
            </details>
          )}
        </Section>

        <Section title={t('tenancy.occupants')}>
          <OccupantsSection tenancyId={id} occupants={occupants ?? []} canEdit={open} />
        </Section>

        <Section title={t('tenancy.documents')}>
          {!consent && <p className="rounded-xl bg-warn-soft p-3 text-sm text-warn">{t('tenancy.consentMissing')}</p>}
          <DocumentsSection
            tenancyId={id}
            tenant={{ id: ty.tenants.id, full_name: ty.tenants.full_name }}
            occupants={(occupants ?? []).filter((o) => !o.end_date)}
            docs={docs ?? []}
            canUpload={open && !!consent}
            staff
          />
        </Section>
      </div>
    </>
  );
}
