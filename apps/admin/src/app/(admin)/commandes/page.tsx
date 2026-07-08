import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { formatGabonPhoneDisplay } from '@eaupourtous/domain/phone';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  company_id: string | null;
  total_amount_fcfa: number;
  volume_liters: number;
  quantity: number;
  address: string;
  created_at: string;
  companies: { commercial_name: string } | null;
  zones: { name: string } | null;
  client_snapshot: { first_name?: string; last_name?: string; phone?: string } | null;
};

const FILTERS = {
  all:         'Toutes',
  awaiting:    'À attribuer',
  pending:     'En attente société',
  accepted:    'Acceptées',
  in_delivery: 'En livraison',
  delivered:   'Livrées',
  incident:    'Incidents',
  cancelled:   'Annulées',
} as const;
type FilterKey = keyof typeof FILTERS;

const statusPill: Record<OrderStatus, string> = {
  pending:         'bg-primary-50 text-primary',
  accepted:        'bg-primary-50 text-primary',
  refused:         'bg-danger-soft text-danger',
  slot_confirmed:  'bg-primary-50 text-primary',
  driver_assigned: 'bg-accent-50 text-accent-700',
  driver_en_route: 'bg-accent-50 text-accent-700',
  arrived_nearby:  'bg-accent-50 text-accent-700',
  delivered:       'bg-accent text-white',
  cancelled:       'bg-surface-muted text-ink-subtle',
  incident:        'bg-danger-soft text-danger',
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const activeFilter: FilterKey = (filter as FilterKey) in FILTERS ? (filter as FilterKey) : 'all';

  const supabase = await createServerClient();
  let query = supabase
    .from('orders')
    .select(`
      id, reference, order_status, company_id, total_amount_fcfa, volume_liters,
      quantity, address, created_at, client_snapshot,
      companies (commercial_name),
      zones (name)
    `)
    .order('created_at', { ascending: false })
    .limit(100);

  if (activeFilter === 'awaiting') query = query.is('company_id', null).eq('order_status', 'pending');
  else if (activeFilter === 'pending') query = query.not('company_id', 'is', null).eq('order_status', 'pending');
  else if (activeFilter === 'accepted') query = query.eq('order_status', 'accepted');
  else if (activeFilter === 'in_delivery') query = query.in('order_status', ['driver_assigned','driver_en_route','arrived_nearby']);
  else if (activeFilter === 'delivered') query = query.eq('order_status', 'delivered');
  else if (activeFilter === 'incident') query = query.eq('order_status', 'incident');
  else if (activeFilter === 'cancelled') query = query.eq('order_status', 'cancelled');

  const { data } = await query.returns<OrderRow[]>();
  const orders = data ?? [];

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Opérations</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Commandes</h1>
        <p className="mt-1 text-sm text-ink-muted">Filtrez, réassignez, suivez en direct.</p>
      </header>

      {/* Filtres */}
      <nav className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {(Object.entries(FILTERS) as [FilterKey, string][]).map(([key, label]) => {
          const active = key === activeFilter;
          return (
            <Link
              key={key}
              href={key === 'all' ? '/commandes' : `/commandes?filter=${key}`}
              className={
                'whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
                (active ? 'bg-ink text-white' : 'bg-white text-ink-muted hover:bg-surface-muted')
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <div className="rounded-lg bg-white p-10 text-center text-sm text-ink-subtle">
          Aucune commande dans cette catégorie.
        </div>
      ) : (
        <>
          {/* Cartes mobile */}
          <ul className="space-y-3 md:hidden">
            {orders.map((o) => {
              const phone = o.client_snapshot?.phone;
              return (
                <li key={o.id}>
                  <Link href={`/commandes/${o.id}`} className="block rounded-lg bg-white p-4 hover:bg-surface-muted">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">{o.reference}</p>
                        <p className="mt-1 truncate font-semibold text-ink">{o.quantity} × {o.volume_liters} L</p>
                        <p className="text-xs text-ink-muted">
                          {phone ? formatGabonPhoneDisplay(phone, { pretty: true }) : '—'} · {o.zones?.name ?? '—'}
                        </p>
                        <p className="mt-1 text-xs text-ink-subtle">
                          {o.companies?.commercial_name ?? (
                            <span className="text-primary">À attribuer</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusPill[o.order_status]}`}>
                          {ORDER_STATUS_LABELS[o.order_status]}
                        </span>
                        <p className="mt-2 text-sm font-bold text-primary">{formatFcfa(o.total_amount_fcfa)}</p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Tableau desktop */}
          <div className="hidden overflow-hidden rounded-lg bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-widest text-ink-subtle">
                <tr>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">MSISDN</th>
                  <th className="px-4 py-3">Quartier</th>
                  <th className="px-4 py-3">Société</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => {
                  const phone = o.client_snapshot?.phone;
                  return (
                    <tr key={o.id} className="hover:bg-surface-muted">
                      <td className="px-4 py-3 font-mono text-xs text-ink-muted">{o.reference}</td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-ink">
                          {phone ? formatGabonPhoneDisplay(phone, { pretty: true }) : '—'}
                        </div>
                        <div className="text-xs text-ink-subtle">{o.quantity} × {o.volume_liters} L</div>
                      </td>
                      <td className="px-4 py-3 text-ink-muted">{o.zones?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-muted">
                        {o.companies?.commercial_name ?? (
                          <span className="text-primary">— à attribuer</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusPill[o.order_status]}`}>
                          {ORDER_STATUS_LABELS[o.order_status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">{formatFcfa(o.total_amount_fcfa)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/commandes/${o.id}`} className="text-sm font-semibold text-primary hover:underline">
                          Ouvrir →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
