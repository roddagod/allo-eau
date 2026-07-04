import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';
import { OrdersLive } from './orders-live';
import { ArrowRightIcon } from '@/components/icons';

export const metadata = { title: 'Mes commandes — Allô Eau' };
export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  company_id: string | null;
  total_amount_fcfa: number;
  volume_liters: number;
  quantity: number;
  created_at: string;
  companies: { commercial_name: string } | null;
};

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

export default async function MyOrdersPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data } = await supabase
    .from('orders')
    .select(`
      id, reference, order_status, company_id, total_amount_fcfa,
      volume_liters, quantity, created_at,
      companies (commercial_name)
    `)
    .eq('client_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<OrderRow[]>();

  const orders = data ?? [];

  return (
    <div>
      <OrdersLive clientId={user.id} />

      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Historique</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Mes commandes</h1>
        </div>
        <Link
          href="/commander"
          className="inline-flex min-h-touch items-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none"
        >
          Nouvelle commande
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </header>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-surface-border bg-white p-10 text-center">
          <p className="text-sm text-ink-muted">Aucune commande pour le moment.</p>
          <Link
            href="/commander"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
          >
            Passer votre première commande
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => {
            const awaiting = o.company_id === null && o.order_status === 'pending';
            const label = awaiting ? 'En cours d’attribution' : ORDER_STATUS_LABELS[o.order_status];
            return (
              <li key={o.id}>
                <Link
                  href={`/mes-commandes/${o.id}`}
                  className="block rounded-2xl border border-surface-border bg-white p-4 transition-colors hover:border-primary sm:p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                        {o.reference}
                      </p>
                      <p className="mt-1 font-semibold text-ink">
                        {o.quantity} × {o.volume_liters} L
                      </p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        {o.companies?.commercial_name ?? (
                          <span className="text-primary">Attribution en cours…</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={
                          'inline-block rounded-full px-3 py-1 text-xs font-semibold ' +
                          (awaiting ? 'bg-primary-50 text-primary' : statusPill[o.order_status])
                        }
                      >
                        {label}
                      </span>
                      <p className="mt-2 text-lg font-bold text-primary">
                        {formatFcfa(o.total_amount_fcfa)}
                      </p>
                    </div>
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
