import { cn } from './cn';

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'neutral' | 'primary';

const tones: Record<Tone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-muted',
  primary: 'bg-primary-soft text-primary',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}

const STATUS_TONES: Record<string, Tone> = {
  occupied: 'ok', vacant: 'warn', reserved: 'info', under_maintenance: 'neutral',
  draft: 'neutral', pending_agreement: 'info', active: 'ok', notice_period: 'warn', completed: 'neutral', cancelled: 'neutral',
  former: 'neutral',
  pending: 'info', partially_paid: 'warn', paid: 'ok', overdue: 'danger',
  submitted: 'info', approved: 'ok', rejected: 'danger', reversed: 'neutral',
  verified: 'ok',
  raised: 'danger', acknowledged: 'warn', assigned: 'info', in_progress: 'info', resolved: 'ok',
  tenant_confirmed: 'ok', closed: 'neutral',
  urgent: 'danger', normal: 'neutral', low: 'neutral',
};

export function toneFor(status: string): Tone {
  return STATUS_TONES[status] ?? 'neutral';
}
