export * from './fields';
export * from './schemas';
export { z } from 'zod';

import type { z } from 'zod';

/** Parse FormData with a schema. Returns field → error key on failure (keys are translated in the UI). */
export function parseForm<S extends z.ZodType>(
  schema: S,
  form: FormData | Record<string, unknown>,
): { ok: true; data: z.infer<S> } | { ok: false; errors: Record<string, string> } {
  const obj = form instanceof FormData ? Object.fromEntries(form.entries()) : form;
  const result = schema.safeParse(obj);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!errors[key]) errors[key] = issue.message.startsWith('Invalid') || issue.message.startsWith('Too') ? 'invalid' : issue.message;
  }
  return { ok: false, errors };
}
