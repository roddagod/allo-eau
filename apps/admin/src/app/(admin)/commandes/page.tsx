import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';

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
  all:         { label: 'Toutes', where: () => ({}) },
  awaiting:    { label: 'À attribuer', where: (q: ReturnType<typeof buildQuery>) => q.is('company_id', null).eq('order_status', 'pending') },
  pending:     { label: 'En attente société', where: (q: ReturnType<typeof buildQuery>) => q.not('company_id', 'is', null).eq('order_status', 'pending') },
  accepted:    { label: 'Acceptées', where: (q: ReturnType<typeof buildQuery>) => q.eq('order_status', 'accepted') },
  in_delivery: { label: 'En livraison', where: (q: ReturnType<typeof buildQuery>) => q.in('order_status', ['driver_assigned','driver_en_route','arrived_nearby']) },
  delivered:   { label: 'Livrées', where: (q: ReturnType<typeof buildQuery>) => q.eq('order_status', 'delivered') },
  incident:    { label: 'Incidents', where: (q: ReturnType<typeof buildQuery>) => q.eq('order_status', 'incident') },
  cancelled:   { label: 'Annulées', where: (q: ReturnType<typeof buildQuery>) => q.eq('order_status', 'cancelled') },
} as const;

type FilterKey = keyof typeof FILTERS;

function buildQuery() {
  return null as unknown as {
    is: (col: string, val: unknown) => ReturnType<typeof buildQuery>;
    eq: (col: string, val: unknown) => ReturnType<typeof buildQuery>;
    in: (col: string, val: unknown[]) => ReturnType<typeof buildQuery>;
    not: (col: string, op: string, val: unknown) => ReturnType<typeof buildQuery>;
  };
}

const statusBadge: Record<OrderStatus, string> = {
  pending:         'bg-slate-100 text-slate-700',
  accepted:        'bg-blue-100 text-blue-700',
  refused:         'bg-red-100 text-red-700',
  slot_confirmed:  'bg-blue-100 text-blue-700',
  driver_assigned: 'bg-amber-100 text-amber-700',
  driver_en_route: 'bg-amber-100 text-amber-700',
  arrived_nearby:  'bg-amber-100 text-amber-700',
  delivered:       'bg-emerald-100 text-emerald-700',
  cancelled:       'bg-slate-100 text-slate-500',
  incident:        'bg-red-100 text-red-700',
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

  // Application des filtres
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
        <h1 className="text-2xl font-bold">Commandes</h1>
        <p className="mt-1 text-sm text-slate-600">
          Filtrez, réassignez, suivez en direct.
        </p>
      </header>

      {/* Filtres — scroll horizontal sur mobile */}
      <nav className="mb-5 flex gap-1 overflow-x-auto pb-1">
        {(Object.entries(FILTERS) as [FilterKey, { label: string }][]).map(([key, def]) => {
          const active = key === activeFilter;
          return (
            <Link
              key={key}
              href={key === 'all' ? '/commandes' : `/commandes?filter=${key}`}
              className={
                'whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ' +
                (active
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200')
              }
            >
              {def.label}
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aucune commande dans cette catégorie.
        </div>
      ) : (
        <>
          {/* Cartes mobile */}
          <ul className="space-y-3 md:hidden">
            {orders.map((o) => {
              const client = [o.client_snapshot?.first_name, o.client_snapshot?.last_name]
                .filter(Boolean).join(' ') || '—';
              return (
                <li key={o.id}>
                  <Link
                    href={`/commandes/${o.id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-gabon-green"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-widest text-slate-500">{o.reference}</p>
                        <p className="mt-0.5 truncate font-semibold text-slate-900">
                          {o.quantity} × {o.volume_liters} L
                        </p>
                        <p className="text-xs text-slate-600">{client} · {o.zones?.name ?? '—'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {o.companies?.commercial_name ?? (
                            <span className="text-amber-700">Attribution en cours…</span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusBadge[o.order_status]}`}>
                          {ORDER_STATUS_LABELS[o.order_status]}
                        </span>
                        <p className="mt-2 text-sm font-bold text-gabon-green">
                          {formatFcfa(o.total_amount_fcfa)}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Tableau desktop */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                <tr>
                  <th className="px-4 py-3">Référence</th>
                  <th className="px-4 py-3">Client</th>
                  <th className="px-4 py-3">Quartier</th>
                  <th className="px-4 py-3">Société</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => {
                  const client = [o.client_snapshot?.first_name, o.client_snapshot?.last_name]
                    .filter(Boolean).join(' ') || '—';
                  return (
                    <tr key={o.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">{o.reference}</td>
                      <td className="px-4 py-3 text-slate-800">
                        <div>{client}</div>
                        <div className="text-xs text-slate-500">{o.quantity} × {o.volume_liters} L</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{o.zones?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {o.companies?.commercial_name ?? (
                          <span className="text-amber-700">— à attribuer</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge[o.order_status]}`}>
                          {ORDER_STATUS_LABELS[o.order_status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {formatFcfa(o.total_amount_fcfa)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/commandes/${o.id}`}
                          className="text-sm font-semibold text-gabon-green hover:underline"
                        >
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
