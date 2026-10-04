import Link from 'next/link';
import { getLocale, getTranslations } from 'next-intl/server';
import { formatDate } from '@fpm/api';
import { Badge, type Tone } from '@/components/ui/badge';
import { Card, List, ListRow, Section } from '@/components/ui/card';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { requireStaff } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { inviteMember, removeMember, setLoginAccess, setMemberRole } from '@/lib/actions/team';
import { resendInvite } from '@/lib/actions/tenancy';

type Login = { disabled: boolean; lastSignIn: string | null };

export default async function UsersPage() {
  const { supabase, user, isOwner } = await requireStaff();
  const t = await getTranslations();
  const locale = await getLocale();
  const [{ data: rows }, { data: tenants }] = await Promise.all([
    supabase.from('property_members').select('user_id, role, profiles(full_name, email)'),
    supabase.from('tenants').select('id, full_name, email, user_id').order('full_name'),
  ]);

  // One line per team member; "owner" if they own any property.
  const people = new Map<string, { id: string; name: string; email: string; role: 'owner' | 'manager' }>();
  for (const r of rows ?? []) {
    const prev = people.get(r.user_id);
    const role = prev?.role === 'owner' || r.role === 'owner' ? 'owner' : 'manager';
    people.set(r.user_id, { id: r.user_id, name: r.profiles?.full_name || r.profiles?.email || '—', email: r.profiles?.email ?? '', role });
  }
  const team = [...people.values()].sort((a, b) => (a.role === b.role ? a.name.localeCompare(b.name) : a.role === 'owner' ? -1 : 1));

  // Login status (blocked / last sign-in) for everyone listed — server only, after the staff check above.
  const ids = [...people.keys(), ...(tenants ?? []).map((x) => x.user_id).filter((x): x is string => !!x)];
  const logins = new Map<string, Login>();
  if (ids.length) {
    const admin = createAdminClient();
    const [{ data: profs }, { data: authUsers }] = await Promise.all([
      admin.from('profiles').select('id, disabled_at').in('id', ids),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    const lastSeen = new Map((authUsers?.users ?? []).map((u) => [u.id, u.last_sign_in_at ?? null]));
    for (const p of profs ?? []) logins.set(p.id, { disabled: !!p.disabled_at, lastSignIn: lastSeen.get(p.id) ?? null });
  }

  const status = (userId: string | null): { tone: Tone; label: string } => {
    if (!userId) return { tone: 'neutral', label: t('users.noLogin') };
    const l = logins.get(userId);
    if (l?.disabled) return { tone: 'danger', label: t('users.blocked') };
    if (!l?.lastSignIn) return { tone: 'warn', label: t('users.invited') };
    return { tone: 'ok', label: t('users.active') };
  };
  const lastSeen = (userId: string | null) => {
    const l = userId ? logins.get(userId) : undefined;
    return l?.lastSignIn ? t('users.lastSeen', { date: formatDate(l.lastSignIn.slice(0, 10), locale) }) : null;
  };
  const accessButton = (userId: string) => {
    const blocked = logins.get(userId)?.disabled;
    return (
      <ActionForm action={setLoginAccess} hidden={{ user_id: userId, enabled: blocked ? 'true' : 'false' }} className="space-y-2">
        <SubmitButton variant="ghost" className="min-h-10 text-sm" confirm={blocked ? undefined : t('users.blockConfirm')}>
          {blocked ? t('users.unblock') : t('users.block')}
        </SubmitButton>
      </ActionForm>
    );
  };
  const roleOptions = (['owner', 'manager'] as const).map((r) => ({ value: r, label: t(`roles.${r}`) }));

  return (
    <>
      <PageHeader title={t('team.title')} subtitle={t('team.subtitle')} />
      <div className="space-y-9">
        <Section title={t('users.team')}>
          <List>
            {team.map((p) => {
              const st = status(p.id);
              return (
                <ListRow key={p.id}>
                  <div className="flex flex-wrap items-center gap-2 font-semibold">
                    {p.name} {p.id === user.id && <span className="text-sm font-normal text-muted">({t('team.you')})</span>}
                    <Badge tone={p.role === 'owner' ? 'primary' : 'info'}>{t(`roles.${p.role}`)}</Badge>
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </div>
                  <div className="truncate text-xs text-muted">{p.email}{lastSeen(p.id) && ` · ${lastSeen(p.id)}`}</div>
                  {isOwner && p.id !== user.id && (
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      <ActionForm action={setMemberRole} hidden={{ user_id: p.id, role: p.role === 'owner' ? 'manager' : 'owner' }} className="space-y-2">
                        <SubmitButton variant="secondary" className="min-h-10 text-sm">
                          {p.role === 'owner' ? t('team.makeManager') : t('team.makeOwner')}
                        </SubmitButton>
                      </ActionForm>
                      {accessButton(p.id)}
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
              );
            })}
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

        <Section title={t('users.tenantLogins')}>
          {(tenants ?? []).length === 0 ? (
            <p className="text-sm text-muted">{t('users.noTenants')}</p>
          ) : (
            <List>
              {tenants!.map((x) => {
                const st = status(x.user_id);
                return (
                  <ListRow key={x.id}>
                    <div className="flex flex-wrap items-center gap-2 font-semibold">
                      <Link href={`/owner/tenants/${x.id}`} className="hover:underline">{x.full_name}</Link>
                      <Badge tone={st.tone}>{st.label}</Badge>
                    </div>
                    <div className="truncate text-xs text-muted">{x.email}{lastSeen(x.user_id) && ` · ${lastSeen(x.user_id)}`}</div>
                    <div className="mt-3 flex flex-wrap items-start gap-2">
                      {!logins.get(x.user_id ?? '')?.disabled && (
                        <ActionForm action={resendInvite} hidden={{ id: x.id }} className="space-y-2">
                          <SubmitButton variant="secondary" className="min-h-10 text-sm">
                            {x.user_id ? t('tenants.resendInvite') : t('tenants.invite')}
                          </SubmitButton>
                        </ActionForm>
                      )}
                      {isOwner && x.user_id && accessButton(x.user_id)}
                    </div>
                  </ListRow>
                );
              })}
            </List>
          )}
          <p className="px-0.5 text-sm text-muted">{t('users.tenantHelp')}</p>
        </Section>
      </div>
    </>
  );
}
