'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useFieldError } from '@/components/ui/form';

/** Finger/mouse signature. Writes a PNG data URL into a hidden "signature" field. */
export function SignaturePad() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState('');
  const drawing = useRef(false);
  const t = useTranslations('agreements');
  const error = useFieldError('signature');

  useEffect(() => {
    const c = canvas.current!;
    const ratio = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * ratio;
    c.height = c.offsetHeight * ratio;
    const ctx = c.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div className="space-y-2">
      <canvas
        ref={canvas}
        aria-label={t('signHere')}
        className={`h-40 w-full touch-none rounded-xl border-2 border-dashed bg-white ${error ? 'border-danger' : 'border-border'}`}
        onPointerDown={(e) => {
          drawing.current = true;
          canvas.current!.setPointerCapture(e.pointerId);
          const ctx = canvas.current!.getContext('2d')!;
          const p = pos(e);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const ctx = canvas.current!.getContext('2d')!;
          const p = pos(e);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }}
        onPointerUp={() => {
          drawing.current = false;
          setData(canvas.current!.toDataURL('image/png'));
        }}
      />
      <input type="hidden" name="signature" value={data} />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">{t('signHere')}</span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            const c = canvas.current!;
            c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
            setData('');
          }}
        >
          {t('clear')}
        </Button>
      </div>
      {error && <p className="text-xs text-danger">{t('signatureRequired')}</p>}
    </div>
  );
}
