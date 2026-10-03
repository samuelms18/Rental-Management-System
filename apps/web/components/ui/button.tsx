import Link from 'next/link';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';
type Size = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-2xl font-semibold tracking-[-0.005em] transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';
const variants: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-primary-2 to-primary text-primary-fg shadow-[0_1px_0_rgb(255_255_255/0.18)_inset,0_6px_16px_-6px_var(--fpm-primary)] hover:brightness-110',
  secondary: 'bg-surface border border-border text-fg shadow-card hover:border-primary/40 hover:bg-surface-2',
  ghost: 'text-primary hover:bg-primary-soft',
  danger: 'bg-danger text-white shadow-card hover:brightness-110',
  whatsapp: 'bg-[#25D366] text-[#073b1c] shadow-card hover:brightness-105',
};
const sizes: Record<Size, string> = {
  md: 'min-h-12 px-5 text-[15px]',
  sm: 'min-h-9 px-3.5 text-sm rounded-xl',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  href,
  external,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; size?: Size; href: string; external?: boolean }) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass(variant, size, className)} {...props} />
    );
  }
  return <Link href={href} className={buttonClass(variant, size, className)} {...props} />;
}
