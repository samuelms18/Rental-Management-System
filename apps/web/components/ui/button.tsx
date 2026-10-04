import Link from 'next/link';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'whatsapp';
type Size = 'md' | 'sm';

const base =
  'btn inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none select-none';
// One coral gradient action per screen; outlined dark for secondary; underlined text for tertiary.
const variants: Record<Variant, string> = {
  primary: 'bg-[image:var(--fpm-btn-gradient)] text-white hover:brightness-95',
  secondary: 'bg-surface border border-fg/85 text-fg hover:bg-surface-2',
  ghost: 'text-fg underline underline-offset-4 hover:bg-surface-2',
  danger: 'bg-danger text-white hover:brightness-95',
  whatsapp: 'bg-[#25D366] text-[#073b1c] hover:brightness-95',
};
const sizes: Record<Size, string> = {
  md: 'min-h-12 px-5 text-[15px]',
  sm: 'min-h-10 px-4 text-sm rounded-lg',
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
