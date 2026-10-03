import { getTranslations } from 'next-intl/server';
import { WifiOff } from 'lucide-react';

export default async function Offline() {
  const t = await getTranslations('app');
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <WifiOff className="size-10 text-muted" />
      <p>{t('offline')}</p>
    </main>
  );
}
