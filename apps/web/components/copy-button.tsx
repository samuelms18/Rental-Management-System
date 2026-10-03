'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  const t = useTranslations('common');
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? t('copied') : t('copy')}
    </Button>
  );
}
