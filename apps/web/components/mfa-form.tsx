'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/browser';
import { Button } from '@/components/ui/button';

export function MfaForm({ mode }: { mode: 'enroll' | 'verify' }) {
  const t = useTranslations('mfa');
  const router = useRouter();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      if (mode === 'verify') {
        const { data } = await supabase.auth.mfa.listFactors();
        setFactorId(data?.totp.find((f) => f.status === 'verified')?.id ?? null);
        return;
      }
      // Remove half-finished enrolments, then start a fresh one.
      const { data: factors } = await supabase.auth.mfa.listFactors();
      for (const f of factors?.all ?? []) {
        if (f.status === 'unverified') await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error: err } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `FPM ${Date.now()}` });
      if (err || !data) return setError(err?.message ?? 'error');
      setFactorId(data.id);
      setQr(data.totp.qr_code);
      setSecret(data.totp.secret);
    })();
  }, [mode]);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    setBusy(false);
    if (err) return setError(t('wrongCode'));
    router.replace('/owner');
    router.refresh();
  }

  return (
    <form onSubmit={verify} className="space-y-5">
      {mode === 'enroll' ? (
        <>
          <p className="text-sm text-muted">{t('enrollIntro')}</p>
          <p className="text-sm font-medium">1. {t('step1')}</p>
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="" className="mx-auto size-48 rounded-xl bg-white p-2" />
          )}
          {secret && (
            <p className="text-xs text-muted">
              {t('manual')} <code className="break-all font-mono text-fg">{secret}</code>
            </p>
          )}
          <p className="text-sm font-medium">2. {t('step2')}</p>
        </>
      ) : (
        <p className="text-sm text-muted">{t('verifyIntro')}</p>
      )}
      <input
        aria-label={t('code')}
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="123456"
        className="block min-h-14 w-full rounded-xl border border-border bg-surface px-3 text-center font-mono text-2xl tracking-[0.4em]"
      />
      {error && <p className="rounded-xl bg-danger-soft p-3 text-sm text-danger">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy || code.length !== 6 || !factorId}>
        {t('verify')}
      </Button>
    </form>
  );
}
