'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { removePushSubscription, savePushSubscription } from '@/lib/actions/push';

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

function keyBytes(b64: string) {
  const pad = b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4);
  return Uint8Array.from(atob(pad), (c) => c.charCodeAt(0));
}

/** Opt-in for phone notifications. iPhone: only after "Add to Home Screen" (iOS 16.4+). */
export function PushToggle() {
  const t = useTranslations('push');
  const [state, setState] = useState<'unsupported' | 'needs-install' | 'off' | 'on' | 'denied' | 'busy'>('busy');

  useEffect(() => {
    (async () => {
      if (!KEY) return setState('unsupported');
      const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone;
      const ios = /iphone|ipad/i.test(navigator.userAgent);
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return setState(ios && !standalone ? 'needs-install' : 'unsupported');
      if (Notification.permission === 'denied') return setState('denied');
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? 'on' : 'off');
    })();
  }, []);

  if (state === 'unsupported' || state === 'busy') return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-3">
      <div className="flex items-center gap-2 text-sm">
        <BellRing className="size-5 text-primary" />
        <span>{t(state === 'on' ? 'on' : state === 'denied' ? 'denied' : state === 'needs-install' ? 'install' : 'offer')}</span>
      </div>
      {state === 'off' && (
        <Button
          size="sm"
          onClick={async () => {
            setState('busy');
            const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js'));
            await navigator.serviceWorker.ready;
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return setState(permission === 'denied' ? 'denied' : 'off');
            const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY!) as BufferSource });
            const res = await savePushSubscription(sub.toJSON(), navigator.userAgent);
            setState(res.ok ? 'on' : 'off');
          }}
        >
          {t('enable')}
        </Button>
      )}
      {state === 'on' && (
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = await reg?.pushManager.getSubscription();
            if (sub) {
              await removePushSubscription(sub.endpoint);
              await sub.unsubscribe();
            }
            setState('off');
          }}
        >
          {t('disable')}
        </Button>
      )}
    </div>
  );
}
