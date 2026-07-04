import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { getUser } from '@eaupourtous/db/get-user';

/**
 * Header public unifié — utilisé par la landing, les pages auth et
 * le parcours guest. Identique visuellement partout : logo, nav ancres
 * vers la landing, actions à droite selon l'état user.
 */
export async function PublicHeader({ hideNav = false }: { hideNav?: boolean }) {
  const user = await getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-surface-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <BrandMark variant="light" size="md" />

        {!hideNav && (
          <nav className="hidden items-center gap-5 text-sm font-medium text-ink-muted md:flex">
            <Link href="/#comment" className="hover:text-ink">Comment ça marche</Link>
            <Link href="/#tarifs" className="hover:text-ink">Tarifs</Link>
            <Link href="/#zones" className="hover:text-ink">Zones</Link>
            <Link href="/nouvelles-mesures" className="hover:text-ink">Nouvelles mesures</Link>
            <Link href="/#urgence" className="hover:text-ink">Numéros verts</Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {user ? (
            <Link
              href="/commander"
              className="inline-flex min-h-touch items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none"
            >
              Accéder à mon espace
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden min-h-touch items-center justify-center rounded-lg px-3 text-sm font-medium text-ink-muted hover:text-ink sm:inline-flex"
              >
                Se connecter
              </Link>
              <Link
                href="/signup"
                className="inline-flex min-h-touch items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none"
              >
                Créer un compte
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
