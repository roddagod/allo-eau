import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:   'bg-gabon-green text-white hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300',
  secondary: 'bg-white text-slate-900 border border-slate-300 hover:bg-slate-50',
  ghost:     'bg-transparent text-slate-700 hover:bg-slate-100',
  danger:    'bg-red-600 text-white hover:bg-red-700',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-base',
  lg: 'h-14 px-6 text-lg',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gabon-green focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? 'Chargement…' : children}
    </button>
  );
}
