/**
 * Small server-rendered SVG charts. Thin marks (≤24px columns, 4px rounded data end), hairline grid,
 * one y-axis, legend for ≥2 series, native hover tooltips (<title>) on generous hit areas, and a table view.
 */
type Series = { name: string; color: string; values: number[] };

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/** ₹ in compact Indian style for axis ticks: ₹12k, ₹1.5L */
export function compactINR(paise: number) {
  const r = paise / 100;
  if (Math.abs(r) >= 100000) return `₹${(r / 100000).toFixed(r % 100000 === 0 ? 0 : 1)}L`;
  if (Math.abs(r) >= 1000) return `₹${(r / 1000).toFixed(r % 1000 === 0 ? 0 : 1)}k`;
  return `₹${r}`;
}

function roundedTop(x: number, y: number, w: number, h: number, r = 4) {
  if (h <= 0) return '';
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

export function ColumnChart({
  title,
  labels,
  series,
  format = compactINR,
  fullFormat,
  tableHeader,
}: {
  title: string;
  labels: string[];
  series: Series[];
  format?: (v: number) => string;
  fullFormat?: (v: number) => string;
  tableHeader: string;
}) {
  // Small canvas so 12-unit text renders at ~12px on a 375px phone.
  const W = 380;
  const H = 210;
  const pad = { l: 46, r: 6, t: 10, b: 26 };
  const max = niceMax(Math.max(0, ...series.flatMap((s) => s.values)));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const band = plotW / Math.max(labels.length, 1);
  const barW = Math.min(24, (band * 0.7) / series.length - 2);
  const groupW = series.length * barW + (series.length - 1) * 2;
  const y = (v: number) => pad.t + plotH - (v / max) * plotH;
  const show = fullFormat ?? format;
  const labelEvery = Math.ceil(labels.length / 5);

  return (
    <figure className="space-y-2">
      {series.length > 1 && (
        <figcaption className="flex flex-wrap gap-4 text-xs text-muted">
          {series.map((s) => (
            <span key={s.name} className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-sm" style={{ background: s.color }} aria-hidden />
              {s.name}
            </span>
          ))}
        </figcaption>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
        {ticks.map((tv) => (
          <g key={tv}>
            <line x1={pad.l} x2={W - pad.r} y1={y(tv)} y2={y(tv)} stroke="var(--fpm-grid)" strokeWidth={1} />
            <text x={pad.l - 6} y={y(tv) + 4} textAnchor="end" fontSize={12} fill="var(--fpm-muted)">{format(tv)}</text>
          </g>
        ))}
        {labels.map((label, i) => {
          const gx = pad.l + band * i + (band - groupW) / 2;
          return (
            <g key={label}>
              <title>{`${label}\n${series.map((s) => `${s.name}: ${show(s.values[i] ?? 0)}`).join('\n')}`}</title>
              <rect x={pad.l + band * i} y={pad.t} width={band} height={plotH} fill="transparent" />
              {series.map((s, si) => {
                const v = s.values[i] ?? 0;
                return <path key={s.name} d={roundedTop(gx + si * (barW + 2), y(v), barW, pad.t + plotH - y(v))} fill={s.color} />;
              })}
              {i % labelEvery === 0 && (
                <text x={pad.l + band * i + band / 2} y={H - 8} textAnchor="middle" fontSize={12} fill="var(--fpm-muted)">{label}</text>
              )}
            </g>
          );
        })}
      </svg>
      <details className="text-sm">
        <summary className="cursor-pointer text-xs text-muted">{tableHeader}</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted"><th className="py-1 pr-3" />{series.map((s) => <th key={s.name} className="py-1 pr-3 text-right">{s.name}</th>)}</tr>
            </thead>
            <tbody>
              {labels.map((l, i) => (
                <tr key={l} className="border-t border-border">
                  <td className="py-1 pr-3">{l}</td>
                  {series.map((s) => <td key={s.name} className="py-1 pr-3 text-right tabular-nums">{show(s.values[i] ?? 0)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}

/** Horizontal bars for one series (e.g. expenses by category); value at the tip. */
export function BarList({ items, format }: { items: Array<{ label: string; value: number }>; format: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="grid grid-cols-[7rem_1fr] items-center gap-3 text-sm" title={`${i.label}: ${format(i.value)}`}>
          <span className="truncate text-muted">{i.label}</span>
          <span className="flex items-center gap-2">
            <span className="h-3 rounded-r-[4px]" style={{ width: `${Math.max(2, (i.value / max) * 80)}%`, background: 'var(--fpm-series-1)' }} />
            <span className="shrink-0 tabular-nums">{format(i.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
