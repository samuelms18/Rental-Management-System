import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import { Card, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { inviteMember, removeMember, setMemberRole } from '@/lib/actions/team';

export default async function TeamPage() {
  const { supabase, user, isOwner } = await requireStaff();
  const t = await getTranslations();
  const { data: rows } = await supabase
    .from('property_members')
    .select('user_id, role, profiles(full_name, email)')
    .order('role', { ascending: false });
  // One line per person; "owner" if they own any property.
  const people = new Map<string, { id: string; name: string; email: string; role: 'owner' | 'manager' }>();
  for (const r of rows ?? []) {
    const prev = people.get(r.user_id);
    const role = prev?.role === 'owner' || r.role === 'owner' ? 'owner' : 'manager';
    people.set(r.user_id, { id: r.user_id, name: r.profiles?.full_name || r.profiles?.email || '—', email: r.profiles?.email ?? '', role });
  }
  const team = [...people.values()].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'owner' ? -1 : 1));
  const roleOptions = (['owner', 'manager'] as const).map((r) => ({ value: r, label: t(`roles.${r}`) }));

  return (
    <>
      <PageHeader title={t('team.title')} subtitle={t('team.subtitle')} />
      <div className="space-y-8">
        <Section title={t('team.people')}>
          <List>
            {team.map((p) => (
              <ListRow key={p.id}>
                <div className="flex flex-wrap items-center gap-2 font-semibold">
                  {p.name} {p.id === user.id && <span className="text-sm font-normal text-muted">({t('team.you')})</span>}
                  <Badge tone={p.role === 'owner' ? 'primary' : 'info'}>{t(`roles.${p.role}`)}</Badge>
                </div>
                <div className="truncate text-xs text-muted">{p.email}</div>
                {isOwner && p.id !== user.id && (
                  <div className="mt-3 flex flex-wrap items-start gap-2">
                    <ActionForm action={setMemberRole} hidden={{ user_id: p.id, role: p.role === 'owner' ? 'manager' : 'owner' }} className="space-y-2">
                      <SubmitButton variant="secondary" className="min-h-10 text-sm">
                        {p.role === 'owner' ? t('team.makeManager') : t('team.makeOwner')}
                      </SubmitButton>
                    </ActionForm>
                    <ActionForm action={removeMember} hidden={{ user_id: p.id }} className="space-y-2">
                      <SubmitButton variant="ghost" className="min-h-10 text-sm" confirm={t('team.removeConfirm', { name: p.name })}>
                        {t('team.remove')}
                      </SubmitButton>
                    </ActionForm>
                  </div>
                )}
                {isOwner && p.id === user.id && p.role === 'owner' && (
                  <div className="mt-3">
                    <ActionForm action={setMemberRole} hidden={{ user_id: p.id, role: 'manager' }} className="space-y-2">
                      <SubmitButton variant="ghost" className="min-h-10 text-sm" confirm={t('team.stepDownConfirm')}>
                        {t('team.stepDown')}
                      </SubmitButton>
                    </ActionForm>
                  </div>
                )}
              </ListRow>
            ))}
          </List>
          <p className="px-0.5 text-sm text-muted">{t('team.rolesHelp')}</p>
        </Section>

        {isOwner ? (
          <Section title={t('team.add')}>
            <Card>
              <ActionForm action={inviteMember} resetOnSuccess>
                <Field name="full_name" label={t('team.name')}>
                  <Input name="full_name" autoComplete="off" />
                </Field>
                <Field name="email" label={t('auth.email')} hint={t('team.emailHint')}>
                  <Input name="email" type="email" inputMode="email" autoComplete="off" />
                </Field>
                <Field name="role" label={t('team.role')}>
                  <Select name="role" options={roleOptions} defaultValue="manager" />
                </Field>
                <SubmitButton>{t('team.invite')}</SubmitButton>
              </ActionForm>
            </Card>
          </Section>
        ) : (
          <p className="rounded-xl bg-surface-2 p-4 text-sm text-muted">{t('team.ownerOnly')}</p>
        )}
      </div>
    </>
  );
}
