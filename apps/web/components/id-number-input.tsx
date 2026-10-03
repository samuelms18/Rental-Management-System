'use client';

import { useState } from 'react';
import { lastFour, maskedId } from '@fpm/api';
import { useFieldError } from '@/components/ui/form';

/**
 * The visible box has NO name, so the full ID number is never sent to the server.
 * Only the hidden last-4 field is submitted.
 */
export function IdNumberInput() {
  const [last4, setLast4] = useState('');
  const error = useFieldError('number_last4');
  return (
    <div className="space-y-1">
      <input
        type="text"
        autoComplete="off"
        inputMode="text"
        aria-invalid={!!error}
        className="block min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2"
        onChange={(e) => setLast4(lastFour(e.target.value) ?? '')}
      />
      <input type="hidden" name="number_last4" value={last4} />
      {last4 && <p className="font-mono text-xs text-muted">{maskedId(last4)}</p>}
    </div>
  );
}
