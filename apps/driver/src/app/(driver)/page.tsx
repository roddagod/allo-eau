import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { formatGabonPhoneDisplay } from '@eaupourtous/domain/phone';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';
import { DriverStatusToggle } from './driver-status-toggle';
import { ClockIcon, MapPinIcon, ArrowRightIcon } from '@/components/icons';

export const metadata = { title: 'Ma tournée — Allô Eau' };
export const dynamic = 'force-dynamic';

type Order = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  address: string;
  delivery_landmark: string | null;
  volume_liters: number;
  quantity: number;
  total_amount_fcfa: number;
  preferred_delivery_time: string | null;
  client_snapshot: { first_name?: string; last_name?: string; phone?: string } | null;
  zones: { name: string } | null;
};

type DriverInfo = {
  id: string;
  reference: string | null;
  status: 'available' | 'on_delivery' | 'off_duty' | 'suspended';
  companies: { commercial_name: string } | null;
};

const ACTIVE_STATUSES: OrderStatus[] = [
  'driver_assigned',
  'driver_en_route',
  'arrived_nearby',
];

const statusPill: Record<OrderStatus, string> = {
  pending:         'bg-white/10 text-white/80',
  accepted:        'bg-white/10 text-white/80',
  refused:         'bg-danger/20 text-danger',
  slot_confirmed:  'bg-white/10 text-white/80',
  driver_assigned: 'bg-amber-500/20 text-amber-200',
  driver_en_route: 'bg-amber-500/20 text-amber-200',
  arrived_nearby:  'bg-amber-500/20 text-amber-200',
  delivered:       'bg-accent/25 text-accent',
  cancelled:       'bg-white/10 text-white/50',
  incident:        'bg-danger/20 text-danger',
};

export default async function DriverHomePage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const [driverRes, ordersRes, deliveredRes] = await Promise.all([
    supabase
      .from('drivers')
      .select('id, reference, status, companies(commercial_name)')
      .eq('id', user.id)
      .single<DriverInfo>(),
    supabase
      .from('orders')
      .select(`
        id, reference, order_status, address, delivery_landmark,
        volume_liters, quantity, total_amount_fcfa, preferred_delivery_time,
        client_snapshot, zones (name)
      `)
      .eq('driver_id', user.id)
      .in('order_status', ACTIVE_STATUSES)
      .order('preferred_delivery_time', { ascending: true })
      .returns<Order[]>(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', user.id)
      .eq('order_status', 'delivered')
      .gte('actual_delivered_at', todayIso),
  ]);

  const driver = driverRes.data;
  const activeOrders = ordersRes.data;
  const deliveredCount = deliveredRes.count ?? 0;

  const orders = activeOrders ?? [];
  const stops = orders.length;
  const totalLiters = orders.reduce((s, o) => s + o.quantity * o.volume_liters, 0);

  return (
    <div className="space-y-6">
      {/* En-tête livreur */}
      <section className="rounded-lg bg-white/5 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Ma tournée du jour
            </p>
            <p className="mt-1 font-mono text-xs text-white/60">
              {driver?.reference ?? '—'}{driver?.companies && <> · {driver.companies.commercial_name}</>}
            </p>
          </div>
          {driver && (
            <DriverStatusToggle driverId={driver.id} initialStatus={driver.status} />
          )}
        </div>

        <dl className="mt-5 grid grid-cols-3 gap-3">
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/50">Arrêts</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{stops}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/50">Volume</dt>
            <dd className="mt-1 font-display text-2xl font-bold">
              {totalLiters >= 1000 ? `${(totalLiters / 1000).toFixed(1)} m³` : `${totalLiters} L`}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-widest text-white/50">Livrées</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-accent">
              {deliveredCount}
            </dd>
          </div>
        </dl>
      </section>

      {/* Liste des arrêts */}
      {orders.length === 0 ? (
        <div className="rounded-lg bg-white/5 p-10 text-center">
          <p className="text-sm text-white/70">Aucune commande à livrer pour le moment.</p>
          <p className="mt-1 text-xs text-white/50">
            Restez disponible — dès qu’une commande vous sera affectée, elle apparaîtra ici.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {orders.map((o, i) => {
            const clientPhone = o.client_snapshot?.phone ?? '';
            return (
              <li key={o.id}>
                <Link
                  href={`/commande/${o.id}`}
                  className="block rounded-lg bg-white/5 p-4 transition-colors hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-white font-display text-lg font-bold">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
                          {o.reference}
                        </p>
                        <p className="mt-0.5 font-semibold">
                          {o.quantity} × {o.volume_liters} L
                        </p>
                        {clientPhone && (
                          <p className="mt-0.5 font-mono text-[11px] text-white/70">
                            {formatGabonPhoneDisplay(clientPhone, { pretty: true })}
                          </p>
                        )}
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-white/70">
                          <MapPinIcon className="h-3.5 w-3.5" />
                          <span className="truncate">
                            {o.zones?.name ?? '—'}
                            {o.delivery_landmark && <> · {o.delivery_landmark}</>}
                          </span>
                        </p>
                        {o.preferred_delivery_time && (
                          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
                            <ClockIcon className="h-3.5 w-3.5" />
                            {o.preferred_delivery_time}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPill[o.order_status]}`}>
                        {ORDER_STATUS_LABELS[o.order_status]}
                      </span>
                      <p className="text-sm font-bold text-accent">
                        {formatFcfa(o.total_amount_fcfa)}
                      </p>
                      <ArrowRightIcon className="h-4 w-4 text-white/40" />
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
