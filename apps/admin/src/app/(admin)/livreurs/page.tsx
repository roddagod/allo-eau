import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { formatGabonPhoneDisplay } from '@eaupourtous/domain/phone';
import { UsersIcon, BuildingIcon, ArrowRightIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type DriverRow = {
  id: string;
  reference: string | null;
  status: 'available' | 'on_delivery' | 'off_duty' | 'suspended';
  companies: { commercial_name: string } | null;
  profile: { first_name: string | null; last_name: string | null; phone: string | null } | null;
};

const statusPill: Record<DriverRow['status'], string> = {
  available:   'bg-accent-50 text-accent-700',
  on_delivery: 'bg-amber-100 text-amber-800',
  off_duty:    'bg-surface-muted text-ink-subtle',
  suspended:   'bg-danger-soft text-danger',
};

const statusLabel: Record<DriverRow['status'], string> = {
  available:   'Disponible',
  on_delivery: 'En livraison',
  off_duty:    'Hors service',
  suspended:   'Suspendu',
};

export default async function DriversListPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();

  // Fetch drivers avec profile join et company
  const { data: drivers } = await supabase
    .from('drivers')
    .select(`
      id, reference, status,
      companies (commercial_name),
      profile:profiles!drivers_id_fkey (first_name, last_name, phone)
    `)
    .order('created_at', { ascending: false })
    .returns<DriverRow[]>();

  const list = drivers ?? [];
  const canCreate = ['super_admin', 'admin', 'company_owner'].includes(user.profile.role);

  const available = list.filter((d) => d.status === 'available').length;
  const onDelivery = list.filter((d) => d.status === 'on_delivery').length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Ressources
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Livreurs</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {list.length} livreur{list.length > 1 ? 's' : ''} enregistré{list.length > 1 ? 's' : ''} · {available} disponible{available > 1 ? 's' : ''} · {onDelivery} en livraison
          </p>
        </div>
        {canCreate && (
          <Link
            href="/livreurs/nouveau"
            className="inline-flex min-h-touch items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-700"
          >
            Nouveau livreur
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        )}
      </header>

      {list.length === 0 ? (
        <div className="rounded-lg bg-white p-10 text-center text-sm text-ink-subtle shadow-sm">
          Aucun livreur enregistré pour le moment.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {list.map((d) => {
            const name = [d.profile?.first_name, d.profile?.last_name].filter(Boolean).join(' ') || '—';
            return (
              <li key={d.id}>
                <Link
                  href={`/livreurs/${d.id}`}
                  className="block rounded-lg bg-white p-4 shadow-sm hover:bg-surface-muted"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                        <UsersIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                          {d.reference ?? '—'}
                        </p>
                        <p className="mt-0.5 font-semibold text-ink">{name}</p>
                        {d.profile?.phone && (
                          <p className="mt-0.5 text-xs text-ink-muted">
                            {formatGabonPhoneDisplay(d.profile.phone, { pretty: true })}
                          </p>
                        )}
                        <p className="mt-1 flex items-center gap-1 text-xs text-ink-subtle">
                          <BuildingIcon className="h-3 w-3" />
                          {d.companies?.commercial_name ?? '—'}
                        </p>
                      </div>
                    </div>
                    <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${statusPill[d.status]}`}>
                      {statusLabel[d.status]}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
