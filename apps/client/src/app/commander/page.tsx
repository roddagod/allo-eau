import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { OrderFlow } from './order-flow';

export const metadata = { title: 'Commander — Allô Eau' };
export const dynamic = 'force-dynamic';

type Zone = { id: string; name: string; sector: string | null };
type CurrentPrice = { tier_id: string; volume_liters: number; label: string; price_fcfa: number };

export default async function CommanderPage() {
  const user = await getUser();
  const supabase = await createServerClient();

  const [{ data: zones }, { data: prices }, profile] = await Promise.all([
    supabase
      .from('zones')
      .select('id, name, sector')
      .eq('status', 'active')
      .order('sector')
      .order('name')
      .returns<Zone[]>(),
    supabase
      .from('current_prices')
      .select('tier_id, volume_liters, label, price_fcfa')
      .order('display_order')
      .returns<CurrentPrice[]>(),
    user
      ? supabase
          .from('profiles')
          .select('detailed_address, delivery_landmark, driver_instructions')
          .eq('id', user.id)
          .single<{
            detailed_address: string | null;
            delivery_landmark: string | null;
            driver_instructions: string | null;
          }>()
      : Promise.resolve({ data: null }),
  ]);

  const isGuest = !user;

  return (
    <div>
      <header className="-mx-4 mb-6 rounded-b-lg bg-primary px-4 py-6 text-white sm:-mx-6 sm:px-6 sm:py-8 lg:-mx-8 lg:px-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
          Nouvelle commande
        </p>
        <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
          {isGuest ? 'Commandez de l’eau' : 'Commander de l’eau'}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-white/85">
          {isGuest
            ? 'Passez commande sans créer de compte. Un code de confirmation vous sera envoyé par SMS à la dernière étape.'
            : 'Une société vous sera attribuée automatiquement selon votre quartier.'}
        </p>
      </header>

      <OrderFlow
        mode={isGuest ? 'guest' : 'auth'}
        zones={zones ?? []}
        prices={prices ?? []}
        defaultZoneId={user?.profile.primaryZoneId ?? ''}
        defaultFirstName={user?.profile.firstName ?? ''}
        defaultLastName={user?.profile.lastName ?? ''}
        defaultPhone={user?.profile.phone ?? ''}
        defaultAddress={profile.data?.detailed_address ?? ''}
        defaultLandmark={profile.data?.delivery_landmark ?? ''}
        defaultInstructions={profile.data?.driver_instructions ?? ''}
      />

      {isGuest && (
        <p className="mt-8 text-center text-sm text-ink-muted">
          Vous avez déjà un compte ?{' '}
          <Link href="/login" className="font-semibold text-primary underline">
            Se connecter
          </Link>
        </p>
      )}
    </div>
  );
}
