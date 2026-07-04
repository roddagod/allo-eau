import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  type OrderStatus,
} from '@eaupourtous/domain/order-status';
import { OrderLive } from './order-live';
import { CheckIcon, ClockIcon, MapPinIcon, PhoneIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type OrderDetail = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  company_id: string | null;
  volume_liters: number;
  quantity: number;
  unit_price_fcfa: number;
  total_amount_fcfa: number;
  address: string;
  delivery_landmark: string | null;
  client_instructions: string | null;
  payment_method: string;
  preferred_delivery_date: string | null;
  preferred_delivery_time: string | null;
  dispatch_attempts: number;
  companies: { commercial_name: string; phone: string | null } | null;
  zones: { name: string } | null;
};

const paymentLabels: Record<string, string> = {
  cash:         'Espèces à la livraison',
  airtel_money: 'Airtel Money',
  moov_money:   'Moov Money',
  clickpay:     'ClickPay',
};

const TIMELINE: OrderStatus[] = [
  'pending',
  'accepted',
  'slot_confirmed',
  'driver_assigned',
  'driver_en_route',
  'delivered',
];

function stepReached(current: OrderStatus, step: OrderStatus): boolean {
  return ORDER_STATUSES.indexOf(current) >= ORDER_STATUSES.indexOf(step);
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();
  const { data: order } = await supabase
    .from('orders')
    .select(`
      id, reference, order_status, company_id, volume_liters, quantity,
      unit_price_fcfa, total_amount_fcfa, address, delivery_landmark,
      client_instructions, payment_method, preferred_delivery_date,
      preferred_delivery_time, dispatch_attempts,
      companies (commercial_name, phone),
      zones (name)
    `)
    .eq('id', orderId)
    .eq('client_id', user.id)
    .single<OrderDetail>();

  if (!order) notFound();

  const awaiting = order.company_id === null && order.order_status === 'pending';
  const cancelled = order.order_status === 'cancelled';
  const incident = order.order_status === 'incident';

  return (
    <div>
      <OrderLive orderId={order.id} />

      <Link href="/mes-commandes" className="text-sm font-medium text-ink-muted hover:text-primary">
        ← Toutes mes commandes
      </Link>

      <header className="mt-3">
        <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
          {order.reference}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
          {order.quantity} × {order.volume_liters} L
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          {order.companies?.commercial_name ?? (
            <span className="text-primary">Attribution en cours…</span>
          )}
          {order.zones?.name && <> · Livraison à {order.zones.name}</>}
        </p>
      </header>

      {/* État attribution */}
      {awaiting && (
        <section className="mt-6 flex items-start gap-3 rounded-2xl border-2 border-primary-100 bg-primary-50 p-5">
          <span className="mt-1 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-primary">
              Nous cherchons la meilleure société pour votre quartier
            </p>
            <p className="mt-1 text-xs text-ink-muted">
              {order.dispatch_attempts === 0
                ? 'Attribution en cours…'
                : `Tentative n°${order.dispatch_attempts + 1}. Vous serez notifié dès qu’une société acceptera.`}
            </p>
          </div>
        </section>
      )}

      {(cancelled || incident) && (
        <section className="mt-6 rounded-2xl border border-danger-soft bg-danger-soft p-5 text-sm text-danger">
          <strong>{ORDER_STATUS_LABELS[order.order_status]}.</strong>{' '}
          {cancelled && 'Cette commande a été annulée.'}
          {incident && ' Un incident a été signalé. Vous serez recontacté.'}
        </section>
      )}

      {/* Timeline */}
      {!awaiting && !cancelled && (
        <section className="mt-6 rounded-2xl border border-surface-border bg-white p-5 sm:p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-subtle">
            Suivi
          </h2>
          <ol className="mt-4 space-y-3">
            {TIMELINE.map((step) => {
              const reached = stepReached(order.order_status, step);
              const current = order.order_status === step;
              return (
                <li key={step} className="flex items-center gap-3">
                  <span
                    className={
                      'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' +
                      (reached
                        ? current
                          ? 'bg-accent text-white'
                          : 'bg-primary text-white'
                        : 'border-2 border-surface-border bg-white text-ink-subtle')
                    }
                    aria-hidden
                  >
                    {reached ? <CheckIcon className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-ink-subtle" />}
                  </span>
                  <span
                    className={
                      'text-sm ' +
                      (current
                        ? 'font-semibold text-ink'
                        : reached
                        ? 'text-ink-muted'
                        : 'text-ink-subtle')
                    }
                  >
                    {ORDER_STATUS_LABELS[step]}
                    {step === 'pending' && current && order.companies?.commercial_name && (
                      <> — en attente d’acceptation par {order.companies.commercial_name}</>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Détails livraison */}
      <section className="mt-6 space-y-4 rounded-2xl border border-surface-border bg-white p-5 sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-subtle">
          Livraison
        </h2>
        <div className="flex gap-3">
          <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="whitespace-pre-wrap text-sm text-ink">{order.address}</p>
            {order.delivery_landmark && (
              <p className="mt-1 text-xs text-ink-subtle">Repère : {order.delivery_landmark}</p>
            )}
          </div>
        </div>

        {(order.preferred_delivery_date || order.preferred_delivery_time) && (
          <div className="flex gap-3">
            <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <p className="text-sm text-ink">
              {order.preferred_delivery_date ?? ''} {order.preferred_delivery_time ?? ''}
            </p>
          </div>
        )}

        {order.companies?.phone && (
          <div className="flex gap-3">
            <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <a href={`tel:${order.companies.phone}`} className="text-sm font-medium text-primary underline">
              {order.companies.phone}
            </a>
          </div>
        )}

        {order.client_instructions && (
          <div>
            <p className="text-xs uppercase tracking-widest text-ink-subtle">Instructions</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{order.client_instructions}</p>
          </div>
        )}
      </section>

      {/* Récap financier */}
      <section className="mt-6 rounded-2xl border-2 border-primary bg-primary-50 p-5 sm:p-6">
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>Prix unitaire</span>
          <span>{formatFcfa(order.unit_price_fcfa)}</span>
        </div>
        <div className="mt-1 flex items-center justify-between text-sm text-ink-muted">
          <span>Quantité</span>
          <span>× {order.quantity}</span>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-primary-100 pt-3">
          <span className="text-sm font-medium text-ink">Total</span>
          <span className="text-3xl font-bold text-primary">
            {formatFcfa(order.total_amount_fcfa)}
          </span>
        </div>
        <p className="mt-3 text-xs text-ink-subtle">
          Paiement : {paymentLabels[order.payment_method] ?? order.payment_method}
        </p>
      </section>
    </div>
  );
}
