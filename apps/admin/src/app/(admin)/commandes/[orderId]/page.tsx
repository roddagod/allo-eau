import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { formatGabonPhoneDisplay } from '@eaupourtous/domain/phone';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';
import { ReassignPanel } from './reassign-panel';
import { AcceptRefusePanel } from './accept-refuse-panel';
import { AssignDriverPanel } from './assign-driver-panel';
import { MapPinIcon, PhoneIcon, ClockIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type OrderDetail = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  company_id: string | null;
  zone_id: string;
  volume_liters: number;
  quantity: number;
  unit_price_fcfa: number;
  total_amount_fcfa: number;
  address: string;
  delivery_landmark: string | null;
  client_instructions: string | null;
  payment_method: string;
  payment_status: string;
  dispatch_attempts: number;
  refused_company_ids: string[];
  driver_id: string | null;
  companies: { commercial_name: string; phone: string | null } | null;
  zones: { name: string; sector: string | null } | null;
  client_snapshot: { first_name?: string; last_name?: string; phone?: string } | null;
};

type EligibleCompany = { id: string; commercial_name: string; operator_type: string };

type DriverPickerRow = {
  id: string;
  reference: string | null;
  status: 'available' | 'on_delivery' | 'off_duty' | 'suspended';
  profile: { first_name: string | null; last_name: string | null } | null;
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

export default async function OrderDetailAdminPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const supabase = await createServerClient();

  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, reference, order_status, company_id, zone_id,
      volume_liters, quantity, unit_price_fcfa, total_amount_fcfa,
      address, delivery_landmark, client_instructions,
      payment_method, payment_status,
      dispatch_attempts, refused_company_ids, client_snapshot, driver_id,
      companies (commercial_name, phone),
      zones (name, sector)
    `)
    .eq('id', orderId)
    .single<OrderDetail>();

  if (!order) notFound();

  // Livreurs de la société attribuée (pour affectation manuelle)
  const drivers: DriverPickerRow[] = order.company_id
    ? (await supabase
        .from('drivers')
        .select(`
          id, reference, status,
          profile:profiles!drivers_id_fkey (first_name, last_name)
        `)
        .eq('company_id', order.company_id)
        .neq('status', 'suspended')
        .returns<DriverPickerRow[]>()).data ?? []
    : [];

  // Charge active par livreur (pour tri UI dans le picker)
  const activeCounts = new Map<string, number>();
  if (drivers.length > 0) {
    const { data: active } = await supabase
      .from('orders')
      .select('driver_id')
      .in('driver_id', drivers.map((d) => d.id))
      .in('order_status', ['driver_assigned', 'driver_en_route', 'arrived_nearby'])
      .returns<{ driver_id: string }[]>();
    for (const row of active ?? []) {
      activeCounts.set(row.driver_id, (activeCounts.get(row.driver_id) ?? 0) + 1);
    }
  }

  const driverOptions = drivers
    .map((d) => ({
      id: d.id,
      reference: d.reference,
      name: [d.profile?.first_name, d.profile?.last_name].filter(Boolean).join(' ') || 'Livreur',
      status: d.status,
      activeOrders: activeCounts.get(d.id) ?? 0,
    }))
    .sort((a, b) => {
      // Disponibles d'abord, puis charge croissante
      if (a.status !== b.status) {
        const rank = { available: 0, on_delivery: 1, off_duty: 2, suspended: 3 } as const;
        return rank[a.status] - rank[b.status];
      }
      return a.activeOrders - b.activeOrders;
    });

  // Sociétés éligibles pour réassignation manuelle : couvrant la zone, active, hors précédemment refusées
  const { data: eligibleData } = await supabase
    .from('company_zones')
    .select('company_id, companies!inner(id, commercial_name, operator_type, status)')
    .eq('zone_id', order.zone_id)
    .returns<{ companies: EligibleCompany & { status: string } }[]>();

  const excluded = new Set([...(order.refused_company_ids ?? []), order.company_id].filter(Boolean));
  const eligible: EligibleCompany[] = (eligibleData ?? [])
    .map((row) => row.companies)
    .filter((c) => c && c.status === 'active' && !excluded.has(c.id));

  const clientPhone = order.client_snapshot?.phone ?? null;
  const awaiting = order.company_id === null && order.order_status === 'pending';

  return (
    <div>
      <Link href="/commandes" className="text-sm font-medium text-ink-muted hover:text-primary">
        ← Toutes les commandes
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">{order.reference}</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
            {order.quantity} × {order.volume_liters} L
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {clientPhone && <span className="font-mono">{formatGabonPhoneDisplay(clientPhone, { pretty: true })}</span>}
            {order.zones?.name && <> · {order.zones.name}</>}
            {order.zones?.sector && <> ({order.zones.sector})</>}
          </p>
        </div>
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusPill[order.order_status]}`}>
          {ORDER_STATUS_LABELS[order.order_status]}
        </span>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* Attribution */}
          <section className="rounded-lg bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-subtle">
              Attribution société
            </h2>
            <div className="mt-4">
              {order.companies?.commercial_name ? (
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-ink">{order.companies.commercial_name}</p>
                    <p className="mt-0.5 text-xs text-ink-subtle">
                      Tentative n°{order.dispatch_attempts}
                      {order.refused_company_ids?.length > 0 && (
                        <> · {order.refused_company_ids.length} refus précédent(s)</>
                      )}
                    </p>
                    {order.companies.phone && (
                      <a href={`tel:${order.companies.phone}`} className="mt-1 inline-block text-sm text-primary underline">
                        {formatGabonPhoneDisplay(order.companies.phone, { pretty: true })}
                      </a>
                    )}
                  </div>
                  {(order.order_status === 'pending' || awaiting) && (
                    <AcceptRefusePanel orderId={order.id} />
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
                  <strong>Aucune société attribuée.</strong> Choisissez manuellement ci-dessous.
                </div>
              )}
            </div>

            <div className="mt-6 border-t border-surface-border pt-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
                Réassignation société
              </p>
              <ReassignPanel orderId={order.id} candidates={eligible} />
            </div>

            {order.company_id && (
              <div className="mt-6 border-t border-surface-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
                  Attribution livreur
                </p>
                <AssignDriverPanel
                  orderId={order.id}
                  drivers={driverOptions}
                  currentDriverId={order.driver_id}
                />
              </div>
            )}
          </section>

          {/* Détails livraison */}
          <section className="space-y-4 rounded-lg bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-subtle">Livraison</h2>
            <div className="flex gap-3">
              <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="whitespace-pre-wrap text-sm text-ink">{order.address}</p>
                {order.delivery_landmark && (
                  <p className="mt-1 text-xs text-ink-subtle">Repère : {order.delivery_landmark}</p>
                )}
              </div>
            </div>
            {order.client_snapshot?.phone && (
              <div className="flex gap-3">
                <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <a href={`tel:${order.client_snapshot.phone}`} className="text-sm font-medium text-primary underline">
                  {formatGabonPhoneDisplay(order.client_snapshot.phone, { pretty: true })}
                </a>
              </div>
            )}
            {order.client_instructions && (
              <div className="flex gap-3">
                <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <p className="text-sm text-ink">{order.client_instructions}</p>
              </div>
            )}
          </section>
        </div>

        {/* Colonne latérale : récap */}
        <aside className="rounded-lg bg-primary-50 p-5 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Récapitulatif</p>
          <div className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-ink-muted">Prix unitaire</span>
              <span className="text-ink">{formatFcfa(order.unit_price_fcfa)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-muted">Quantité</span>
              <span className="text-ink">× {order.quantity}</span>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-primary-100 pt-3">
            <span className="text-sm font-medium text-ink">Total</span>
            <span className="text-2xl font-bold text-primary">{formatFcfa(order.total_amount_fcfa)}</span>
          </div>
          <p className="mt-3 text-xs text-ink-subtle">
            Paiement : {order.payment_method} · Statut : {order.payment_status}
          </p>
        </aside>
      </div>
    </div>
  );
}
