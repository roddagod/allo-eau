import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { SignupForm } from './signup-form';

export const metadata = { title: 'Créer un compte — Allô Eau' };
export const dynamic = 'force-dynamic';

type Zone = { id: string; name: string; sector: string | null };

async function fetchZones(): Promise<Zone[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('zones')
    .select('id, name, sector')
    .eq('status', 'active')
    .order('sector')
    .order('name')
    .returns<Zone[]>();
  return data ?? [];
}

export default async function SignupPage() {
  const zones = await fetchZones();

  return (
    <div className="rounded-2xl border border-surface-border bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">
          Inscription
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Créer un compte</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Déjà inscrit ?{' '}
          <Link href="/login" className="font-semibold text-primary underline">
            Se connecter
          </Link>
        </p>
      </div>

      <SignupForm zones={zones} />
    </div>
  );
}
