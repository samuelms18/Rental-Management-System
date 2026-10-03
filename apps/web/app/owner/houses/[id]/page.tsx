import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { PHOTO_AREAS } from '@fpm/validation';
import { Badge, toneFor } from '@/components/ui/badge';
import { Button, LinkButton } from '@/components/ui/button';
import { Card, DefList, Empty, List, ListLink, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { FileInput } from '@/components/ui/file-input';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { EbAccountForm } from '@/components/eb-account-form';
import { ColumnChart } from '@/components/charts';
import { requireStaff } from '@/lib/auth';
import { addHousePhoto, deleteHouse, deleteHousePhoto, setHouseStatus } from '@/lib/actions/properties';
import { fileUrl } from '@/lib/file-url';

export default async function HouseDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, isOwner } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const { data: house } = await supabase.from('houses').select('*, properties(id, name)').eq('id', id).maybeSingle();
  if (!house) notFound();
  const [{ data: photos }, { data: tenancies }, { data: eb }, { data: timelineRows }, { data: meter }] = await Promise.all([
    supabase.from('house_photos').select('*').eq('house_id', id).order('area').order('sort_order'),
    supabase.from('tenancies').select('id, code, status, start_date, actual_end_date, tenants(full_name)').eq('house_id', id).order('start_date', { ascending: false }),
    supabase.from('eb_accounts').select('*').eq('house_id', id).maybeSingle(),
    supabase.rpc('house_timeline', { p_house_id: id }),
    supabase.rpc('meter_history', { p_house_id: id }),
  ]);
  const live = tenancies?.find((x) => ['active', 'notice_period', 'pending_agreement', 'draft'].includes(x.status));
  const grouped = PHOTO_AREAS.map((area) => [area, (photos ?? []).filter((p) => p.area === area)] as const).filter(([, list]) => list.length);
  const canSetStatus = house.status !== 'occupied';

  const timeline = (timelineRows ?? []).map((e) => ({
    date: e.on_date,
    text: `${t(`history.${e.kind}`)} · ${e.label}${e.amount_paise != null ? ` · ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(e.amount_paise / 100)}` : ''}`,
  }));
  const meterRows = (meter ?? []).filter((m) => m.units != null);

  return (
    <>
      <PageHeader
        title={house.unit_number}
        subtitle={<Link href={`/owner/properties/${house.property_id}`} className="text-primary">{house.properties?.name}</Link>}
        back={`/owner/properties/${house.property_id}`}
        action={<LinkButton href={`/owner/houses/${id}/edit`} variant="secondary" size="sm">{t('common.edit')}</LinkButton>}
      />
      {error === 'delete' && <p className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">{t('houses.deleteConfirm')}</p>}
      <div className="space-y-8">
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge tone={toneFor(house.status)}>{t(`status.house.${house.status}`)}</Badge>
            {house.default_rent_paise > 0 && <Money paise={house.default_rent_paise} className="font-semibold" />}
          </div>
          <DefList
            items={[
              [t('houses.unitType'), house.unit_type],
              [t('houses.floor'), house.floor],
              [t('houses.bedrooms'), house.bedrooms],
              [t('houses.bathrooms'), house.bathrooms],
              [t('houses.area'), house.area_sqft],
              [t('houses.defaultAdvance'), <Money key="a" paise={house.default_advance_paise} />],
            ]}
          />
          {canSetStatus && (
            <ActionForm action={setHouseStatus} hidden={{ id }} className="flex items-end gap-2 space-y-0">
              <div className="flex-1">
                <Field name="status" label={t('houses.setStatus')}>
                  <Select name="status" defaultValue={house.status} options={['vacant', 'reserved', 'under_maintenance'].map((s) => ({ value: s, label: t(`status.house.${s}`) }))} />
                </Field>
              </div>
              <SubmitButton variant="secondary">{t('common.save')}</SubmitButton>
            </ActionForm>
          )}
          <p className="text-xs text-muted">{t('houses.statusAuto')}</p>
        </Card>

        <Section title={t('houses.currentTenancy')}>
          {live ? (
            <List>
              <ListLink href={`/owner/tenancies/${live.id}`} right={<Badge tone={toneFor(live.status)}>{t(`status.tenancy.${live.status}`)}</Badge>}>
                <div className="font-medium">{live.tenants?.full_name}</div>
                <div className="text-xs text-muted">{live.code} · {formatDate(live.start_date, locale)}</div>
              </ListLink>
            </List>
          ) : (
            <div className="space-y-3">
              <Empty>{t('houses.noTenancy')}</Empty>
              <LinkButton href={`/owner/tenancies/new?house=${id}`}>{t('houses.newTenancy')}</LinkButton>
            </div>
          )}
        </Section>

        <Section title={t('houses.photos')}>
          {grouped.length === 0 && <Empty>{t('houses.noPhotos')}</Empty>}
          {grouped.map(([area, list]) => (
            <div key={area} className="space-y-2">
              <h3 className="text-sm font-medium text-muted">{t(`labels.photoArea.${area}`)}</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {list.map((p) => (
                  <figure key={p.id} className="relative">
                    <a href={fileUrl('house-photos', p.storage_path)!} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={fileUrl('house-photos', p.storage_path)!} alt={p.caption ?? ''} loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                    </a>
                    {isOwner && (
                      <form action={deleteHousePhoto} className="absolute right-1 top-1">
                        <input type="hidden" name="id" value={p.id} />
                        <button className="rounded-full bg-black/60 px-2 text-xs text-white" aria-label={t('houses.deletePhoto')}>✕</button>
                      </form>
                    )}
                  </figure>
                ))}
              </div>
            </div>
          ))}
          <Card>
            <ActionForm action={addHousePhoto} hidden={{ house_id: id }} resetOnSuccess>
              <Field name="area" label={t('houses.area_label')}>
                <Select name="area" options={PHOTO_AREAS.map((a) => ({ value: a, label: t(`labels.photoArea.${a}`) }))} />
              </Field>
              <Field name="file" label={t('houses.addPhoto')}>
                <FileInput name="file" multiple />
              </Field>
              <Field name="caption" label={t('houses.caption')} optional>
                <Input name="caption" />
              </Field>
              <SubmitButton>{t('common.upload')}</SubmitButton>
            </ActionForm>
          </Card>
        </Section>

        <Section title={t('houses.ebAccount')}>
          <Card><EbAccountForm houseId={id} account={eb} /></Card>
        </Section>

        {meterRows.length > 0 && (
          <Section title={t('history.meterTitle')}>
            <Card>
              <ColumnChart
                title={t('history.meterTitle')}
                labels={meterRows.map((m) => formatDate(m.read_on, locale))}
                series={[{ name: t('eb.units'), color: 'var(--fpm-series-1)', values: meterRows.map((m) => Number(m.units)) }]}
                format={(v) => String(Math.round(v))}
                tableHeader={t('reports.table')}
              />
            </Card>
          </Section>
        )}

        {timeline.length > 0 && (
          <Section title={t('houses.history')}>
            <ol className="space-y-2 border-l-2 border-border pl-4">
              {timeline.map((e, i) => (
                <li key={i} className="text-sm">
                  <span className="font-medium">{formatDate(e.date, locale)}</span> — {e.text}
                </li>
              ))}
            </ol>
          </Section>
        )}

        {isOwner && !tenancies?.length && (
          <form action={deleteHouse}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="property_id" value={house.property_id} />
            <Button variant="danger" size="sm">{t('houses.deleteHouse')}</Button>
          </form>
        )}
        {!isOwner && <p className="text-xs text-muted">{t('houses.ownerOnlyDelete')}</p>}
      </div>
    </>
  );
}
