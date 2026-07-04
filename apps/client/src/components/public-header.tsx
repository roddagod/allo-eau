import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { getUser } from '@eaupourtous/db/get-user';
import { ArrowRightIcon } from '@/components/icons';

/**
 * Header public unifié — utilisé par la landing, les pages auth et
 * le parcours guest.
 *
 * Post-refonte : on retire les CTAs login/signup (parcours guest = principal),
 * on garde uniquement "Suivre ma commande" et "Commander".
 */
export async function PublicHeader({ hideNav = false }: { hideNav?: boolean }) {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandMark variant="light" size="md" />

        {!hideNav && (
          <nav className="hidden items-center gap-5 text-sm font-medium text-ink-muted md:flex">
            <Link href="/nouvelles-mesures" className="font-semibold text-danger hover:opacity-80">
              Nouvelles mesures
            </Link>
            <Link href="/#tarifs" className="hover:text-ink">Tarifs</Link>
            <Link href="/#urgence" className="hover:text-ink">Numéros verts</Link>
            <Link href="/#comment" className="hover:text-ink">Comment ça marche</Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          <Link
            href="/suivre"
            className="hidden min-h-touch items-center justify-center rounded-lg px-3 text-sm font-medium text-ink-muted hover:text-ink sm:inline-flex"
          >
            Suivre ma commande
          </Link>
          <Link
            href={user ? '/mes-commandes' : '/commander'}
            className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none"
          >
            {user ? 'Mes commandes' : 'Commander'}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
