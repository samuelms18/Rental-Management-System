'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera } from 'lucide-react';
import { useFieldError } from './form';

const MAX_EDGE = 1600;

/** Re-encode a photo to WebP, max 1600px on the long edge. Re-encoding drops EXIF/GPS metadata. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.type !== 'image/webp') return file; // old Safari: server still validates
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
  } catch {
    return file;
  }
}

export function FileInput({
  name,
  accept = 'image/*',
  capture,
  multiple,
}: {
  name: string;
  accept?: string;
  capture?: boolean;
  multiple?: boolean;
}) {
  const [label, setLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const error = useFieldError(name);
  const t = useTranslations();

  return (
    <div>
      <label
        className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-dashed px-3 py-2 ${
          error ? 'border-danger' : 'border-border'
        } bg-surface hover:bg-surface-2`}
      >
        <Camera className="size-5 shrink-0 text-muted" />
        <span className="min-w-0 truncate text-sm text-muted">{busy ? '…' : label ?? t('common.upload')}</span>
        <input
          id={name}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          {...(capture ? { capture: 'environment' as const } : {})}
          className="sr-only"
          onChange={async (e) => {
            const input = e.currentTarget;
            const files = Array.from(input.files ?? []);
            if (!files.length) return setLabel(null);
            setBusy(true);
            const processed = await Promise.all(files.map(compressImage));
            const dt = new DataTransfer();
            processed.forEach((f) => dt.items.add(f));
            input.files = dt.files;
            setLabel(processed.map((f) => f.name).join(', '));
            setBusy(false);
          }}
        />
      </label>
      {error && <p className="mt-1 text-xs text-danger">{t.has(`errors.${error}`) ? t(`errors.${error}`) : t('errors.invalid')}</p>}
    </div>
  );
}
