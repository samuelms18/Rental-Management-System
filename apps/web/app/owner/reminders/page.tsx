import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate, todayIST } from '@fpm/api';
import { Badge } from '@/components/ui/badge';
import { LinkButton } from '@/components/ui/button';
import { Empty, List, ListRow } from '@/components/ui/card';
import { Money } from '@/components/ui/money';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { reminderLink } from '@/lib/whatsapp';

export default async function RemindersPage() {
  const { supabase, profile } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const today = todayIST();
  const [{ data: due }, { data: payees }] = await Promise.all([
    supabase.rpc('reminders_due', { p_date: today }),
    supabase.from('payee_settings').select('property_id, payee_name'),
  ]);

  const items = await Promise.all(
    (due ?? []).map(async (r) => ({
      r,
      link: await reminderLink({
        type: r.type,
        stage: r.stage as 'upcoming' | 'due' | 'overdue',
        tenantName: r.tenant_name,
        tenantPhone: r.tenant_phone,
        language: r.tenant_language,
        amountPaise: r.outstanding_paise,
        dueDate: r.due_date,
        house: r.house_unit,
        ownerName: payees?.find((p) => p.property_id === r.property_id)?.payee_name ?? profile.full_name,
      }),
    })),
  );

  return (
    <>
      <PageHeader title={t('reminders.title')} subtitle={t('reminders.help')} />
      {items.length === 0 ? (
        <Empty>{t('reminders.empty')}</Empty>
      ) : (
        <List>
          {items.map(({ r, link }) => (
            <ListRow key={r.charge_id} right={<LinkButton href={link} external variant="whatsapp" size="sm">{t('reminders.send')}</LinkButton>}>
              <div className="font-medium">{r.house_unit} · {r.tenant_name}</div>
              <div className="text-xs text-muted">
                {t(`labels.chargeType.${r.type}`)} · <Money paise={r.outstanding_paise} /> · {formatDate(r.due_date, locale)}
              </div>
              <div className="mt-1">
                <Badge tone={r.stage === 'overdue' ? 'danger' : r.stage === 'due' ? 'warn' : 'info'}>
                  {r.stage === 'overdue'
                    ? t('common.daysOverdue', { count: r.days_from_due })
                    : r.stage === 'due'
                      ? t('common.today')
                      : t('common.days', { count: -r.days_from_due })}
                </Badge>
              </div>
            </ListRow>
          ))}
        </List>
      )}
      <p className="mt-4 text-xs text-muted">{t('reminders.quiet')}</p>
    </>
  );
}
