import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Marque institutionnelle Allô Eau.
 * 3 barres verticales (vert / jaune / bleu du drapeau gabonais) + libellé.
 *
 * Variants :
 *  - `light`  : sur fond clair — libellés foncés
 *  - `dark`   : sur fond sombre (hero, footer) — libellés blancs
 */
export function BrandMark({
  variant = 'light',
  size = 'md',
  href = '/',
  className,
}: {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  href?: string | null;
  className?: string;
}) {
  const barSize = { sm: 'h-8 w-[6px]', md: 'h-11 w-[7px]', lg: 'h-16 w-[9px]' }[size];
  const subLabel = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' }[size];
  const mainLabel = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
  }[size];

  const isDark = variant === 'dark';

  const content = (
    <span className={cn('inline-flex items-stretch gap-3', className)}>
      {/* 3 barres empilées — drapeau Gabon */}
      <span
        className={cn(
          'flex shrink-0 flex-col overflow-hidden rounded-[2px]',
          barSize,
        )}
        aria-hidden
      >
        <span className="flex-1 bg-gabon-green" />
        <span className="flex-1 bg-gabon-yellow" />
        <span className="flex-1 bg-gabon-blue" />
      </span>

      {/* Libellés */}
      <span className="flex flex-col justify-center leading-tight">
        <span
          className={cn(
            'font-bold uppercase tracking-[0.18em]',
            subLabel,
            isDark ? 'text-white/80' : 'text-slate-500',
          )}
        >
          République Gabonaise
        </span>
        <span
          className={cn(
            'font-bold uppercase tracking-[0.14em]',
            mainLabel,
            isDark ? 'text-white' : 'text-slate-900',
          )}
        >
          Allô Eau
        </span>
      </span>
    </span>
  );

  return href ? (
    <Link href={href} className="inline-flex items-center focus-visible:outline-none">
      {content}
    </Link>
  ) : (
    content
  );
}
