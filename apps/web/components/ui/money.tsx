import { formatINR } from '@fpm/api';

export function Money({ paise, className }: { paise: number | null | undefined; className?: string }) {
  return <span className={`tabular-nums ${className ?? ''}`}>{formatINR(paise ?? 0)}</span>;
}
