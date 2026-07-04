import { getUser } from '@eaupourtous/db/get-user';
import { PublicHeader } from '@/components/public-header';
import { AppNav } from '@/components/app-nav';

/**
 * `/commander` — parcours unifié auth + guest.
 * Le header s'adapte à l'état de session : PublicHeader si anonyme, AppNav si connecté.
 */
export default async function CommanderLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();

  return (
    <div className="min-h-dvh bg-surface-muted">
      {user ? <AppNav user={user} /> : <PublicHeader hideNav />}
      <main id="main" className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    </div>
  );
}
