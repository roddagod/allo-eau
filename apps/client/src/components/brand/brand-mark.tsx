import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/cn';

/**
 * Marque institutionnelle Allô Eau.
 * Petit sceau République Gabonaise + libellé « Allô Eau ».
 *
 * Variants :
 *  - `light` : sur fond clair — libellés foncés
 *  - `dark`  : sur fond sombre (hero, footer) — libellés blancs
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
  const logoSize = { sm: 32, md: 40, lg: 56 }[size];
  const mainLabel = {
    sm: 'text-sm',
    md: 'text-base sm:text-lg',
    lg: 'text-xl sm:text-2xl',
  }[size];
  const subLabel = { sm: 'text-[9px]', md: 'text-[10px]', lg: 'text-xs' }[size];

  const isDark = variant === 'dark';

  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <Image
        src="/institution/ministere-eau-energie.png"
        alt=""
        aria-hidden
        width={logoSize * 2}
        height={logoSize * 2}
        priority
        className="shrink-0"
        style={{ width: logoSize, height: 'auto' }}
      />
      <span className="flex flex-col justify-center leading-tight">
        <span
          className={cn(
            'font-bold uppercase tracking-[0.18em]',
            subLabel,
            isDark ? 'text-white/70' : 'text-slate-500',
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
