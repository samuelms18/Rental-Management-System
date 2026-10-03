import { fileUrl } from '@/lib/file-url';

export function PhotoGrid({ bucket, paths, cols = 3 }: { bucket: string; paths: string[]; cols?: number }) {
  if (!paths.length) return <p className="text-xs text-muted">—</p>;
  return (
    <div className={`grid gap-2 ${cols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {paths.map((p) => (
        <a key={p} href={fileUrl(bucket, p)!} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileUrl(bucket, p)!} alt="" loading="lazy" className="aspect-square w-full rounded-xl object-cover" />
        </a>
      ))}
    </div>
  );
}
