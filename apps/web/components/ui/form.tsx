'use client';

import { createContext, startTransition, useActionState, useContext, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { ActionState } from '@/lib/action-state';
import { buttonClass } from './button';
import { cn } from './cn';

const FormStateContext = createContext<ActionState>({});
const FormPendingContext = createContext(false);

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
  hidden,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  hidden?: Record<string, string | number | null | undefined>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, resetOnSuccess, router]);

  return (
    <FormStateContext.Provider value={state}>
      <FormPendingContext.Provider value={pending}>
      <form
        ref={ref}
        action={formAction}
        className={cn('space-y-4', className)}
        noValidate
        // Submit manually so React does not reset the fields: on a validation error the user keeps what they typed.
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => formAction(data));
        }}
      >
        {hidden &&
          Object.entries(hidden).map(([k, v]) =>
            v === null || v === undefined ? null : <input key={k} type="hidden" name={k} value={String(v)} />,
          )}
        {children}
        <FormMessage />
      </form>
      </FormPendingContext.Provider>
    </FormStateContext.Provider>
  );
}

export function useFieldError(name: string): string | undefined {
  return useContext(FormStateContext).errors?.[name];
}

function FormMessage() {
  const state = useContext(FormStateContext);
  const t = useTranslations();
  const formError = state.errors?._form;
  if (formError) {
    return (
      <div role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
        {t.has(`errors.${formError}`) ? t(`errors.${formError}`) : t('errors.generic')}
        {state.detail && <div className="mt-1 text-xs opacity-80">{state.detail}</div>}
      </div>
    );
  }
  if (state.ok && state.message) {
    return (
      <div role="status" className="rounded-xl bg-ok-soft px-3 py-2 text-sm text-ok">
        {t(state.message, state.messageValues)}
      </div>
    );
  }
  return null;
}

export function Field({
  name,
  label,
  hint,
  optional,
  children,
}: {
  name: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const error = useFieldError(name);
  const t = useTranslations();
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">({t('common.optional')})</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {t.has(`errors.${error}`) ? t(`errors.${error}`) : t('errors.invalid')}
        </p>
      )}
    </div>
  );
}

const inputClass =
  'block w-full min-h-11 rounded-xl border border-border bg-surface px-3 py-2 text-fg placeholder:text-muted/70 focus:border-primary focus:outline-none aria-[invalid=true]:border-danger';

export function Input({ name, className, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  const error = useFieldError(name);
  return <input id={name} name={name} aria-invalid={!!error} className={cn(inputClass, className)} {...props} />;
}

export function MoneyInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> & { name: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted">₹</span>
      <Input inputMode="decimal" autoComplete="off" className="pl-7" {...props} />
    </div>
  );
}

export function Textarea({ name, className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }) {
  const error = useFieldError(name);
  return <textarea id={name} name={name} rows={3} aria-invalid={!!error} className={cn(inputClass, className)} {...props} />;
}

export function Select({
  name,
  options,
  className,
  placeholder,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  const error = useFieldError(name);
  return (
    <select id={name} name={name} aria-invalid={!!error} className={cn(inputClass, className)} {...props}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({ name, label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { name: string; label: React.ReactNode }) {
  const error = useFieldError(name);
  const t = useTranslations();
  return (
    <div>
      <label className="flex min-h-11 items-start gap-3 text-sm">
        <input type="checkbox" name={name} className="mt-0.5 size-5 shrink-0 accent-[var(--fpm-primary)]" {...props} />
        <span>{label}</span>
      </label>
      {error && <p className="text-xs text-danger">{t.has(`errors.${error}`) ? t(`errors.${error}`) : t('errors.invalid')}</p>}
    </div>
  );
}

export function SubmitButton({
  children,
  variant = 'primary',
  className,
  confirm,
  name,
  value,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  className?: string;
  confirm?: string;
  name?: string;
  value?: string;
}) {
  const pending = useContext(FormPendingContext);
  const t = useTranslations('common');
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className={buttonClass(variant, 'md', cn('w-full sm:w-auto', className))}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? t('saving') : children}
    </button>
  );
}
