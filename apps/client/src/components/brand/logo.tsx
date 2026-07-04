import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Logo institutionnel réutilisable.
 * - `sm` : navbar
 * - `md` : formulaires auth
 * - `lg` : landing hero
 *
 * Wrap en Link vers `/` par défaut (désactivable via `asChild`).
 */
export function Logo({
  size = 'md',
  showText = true,
  href = '/',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  href?: string | null;
  className?: string;
}) {
  const dims = { sm: 36, md: 48, lg: 72 }[size];
  const textSize = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size];

  const content = (
    <span className={cn('flex items-center gap-3', className)}>
      <Image
        src="/logo-ministere.jpg"
        alt="Armoiries — Ministère de l’Accès Universel à l’Eau et à l’Énergie"
        width={dims}
        height={dims}
        className="rounded-md ring-1 ring-surface-border"
        priority={size === 'lg'}
      />
      {showText && (
        <span className="flex flex-col leading-tight">
          <span className={cn('font-bold text-ink', textSize === 'text-xs' ? 'text-sm' : 'text-base')}>
            Allô Eau
          </span>
          <span className={cn(textSize, 'text-ink-subtle')}>
            République Gabonaise
          </span>
        </span>
      )}
    </span>
  );

  return href ? <Link href={href} className="inline-flex items-center focus-visible:outline-none">{content}</Link> : content;
}
