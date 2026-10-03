/** URL of the access-checked file route. The route redirects to a 5-minute signed URL. */
export function fileUrl(bucket: string, path: string | null | undefined, download = false): string | null {
  if (!path) return null;
  return `/api/files?b=${encodeURIComponent(bucket)}&p=${encodeURIComponent(path)}${download ? '&download=1' : ''}`;
}
