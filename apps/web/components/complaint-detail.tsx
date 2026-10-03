import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import type { Tables } from '@fpm/types';
import { Badge, toneFor } from '@/components/ui/badge';
import { Card, DefList, Section } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { fileUrl } from '@/lib/file-url';

export async function ComplaintSummary({
  c,
  media,
  updates,
}: {
  c: Tables<'complaints'>;
  media: Tables<'complaint_media'>[];
  updates: Tables<'complaint_updates'>[];
}) {
  const t = await getTranslations();
  const locale = await getLocale();
  return (
    <>
      <Card className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Badge tone={toneFor(c.status)}>{t(`status.complaint.${c.status}`)}</Badge>
          <Badge tone={toneFor(c.priority)}>{t(`labels.priority.${c.priority}`)}</Badge>
          <Badge>{t(`labels.complaintCategory.${c.category}`)}</Badge>
        </div>
        {c.description && <p className="whitespace-pre-wrap text-sm">{c.description}</p>}
        <DefList
          items={[
            [t('common.date'), formatDate(c.created_at, locale)],
            [t('complaints.assignedTo'), [c.assigned_name, c.assigned_phone].filter(Boolean).join(' · ') || null],
            [t('complaints.resolution'), c.resolution_note],
            ...(c.resolution_cost_paise != null ? [[t('complaints.cost'), <Money key="c" paise={c.resolution_cost_paise} />] as [string, React.ReactNode]] : []),
          ]}
        />
        {media.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {media.map((m) =>
              m.kind === 'video' ? (
                <video key={m.id} src={fileUrl('complaint-media', m.path)!} controls preload="none" className="aspect-square w-full rounded-xl bg-black object-cover" />
              ) : (
                <a key={m.id} href={fileUrl('complaint-media', m.path)!} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={fileUrl('complaint-media', m.path)!} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
                </a>
              ),
            )}
          </div>
        )}
      </Card>
      <Section title={t('complaints.history')}>
        <ol className="space-y-2 border-l-2 border-border pl-4">
          {updates.map((u) => (
            <li key={u.id} className="text-sm">
              <span className="font-medium">{t(`status.complaint.${u.to_status}`)}</span>
              <span className="text-muted"> · {formatDate(u.created_at, locale)}</span>
              {u.note && <div className="text-muted">{u.note}</div>}
            </li>
          ))}
        </ol>
      </Section>
    </>
  );
}
