import { redirect } from 'next/navigation';
import { getUser } from '@eaupourtous/db/get-user';
import { BrandMark } from '@/components/brand/brand-mark';
import { signOutAction } from '@/lib/auth-actions';
import { GpsTracker } from '@/components/gps-tracker';
import { OrdersLive } from '@/components/orders-live';

export default async function DriverLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.profile.role !== 'driver') redirect('/login');
  if (user.profile.status !== 'active') redirect('/login');

  return (
    <div className="min-h-dvh bg-ink-soft text-white">
      {/* GPS tracker — invisible, poll navigator.geolocation toutes les 30 s */}
      <GpsTracker driverId={user.id} />
      {/* Realtime : refresh RSC dès qu'une commande est affectée / change de statut */}
      <OrdersLive driverId={user.id} />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-ink-soft/95 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <BrandMark variant="dark" size="sm" href="/" />
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
            >
              Se déconnecter
            </button>
          </form>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-lg px-4 pb-24 pt-4">
        {children}
      </main>
    </div>
  );
}
