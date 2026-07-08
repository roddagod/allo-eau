import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { formatGabonPhoneDisplay } from '@eaupourtous/domain/phone';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';
import { StatusActions } from './status-actions';
import { MapPinIcon, PhoneIcon, ClockIcon, DropletIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type OrderDetail = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  address: string;
  delivery_landmark: string | null;
  client_instructions: string | null;
  volume_liters: number;
  quantity: number;
  total_amount_fcfa: number;
  payment_method: string;
  preferred_delivery_date: string | null;
  preferred_delivery_time: string | null;
  delivery_point: string | null;
  client_snapshot: { first_name?: string; last_name?: string; phone?: string } | null;
  zones: { name: string } | null;
};

const paymentLabels: Record<string, string> = {
  cash:         'Espèces à la livraison',
  airtel_money: 'Airtel Money',
  moov_money:   'Moov Money',
  clickpay:     'ClickPay',
};

/** Parse "POINT(lng lat)" → [lat, lng] pour URL */
function parseDeliveryPoint(wkt: string | null): string | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
  if (!m) return null;
  return `${m[2]},${m[1]}`;
}

export default async function OrderDetailDriverPage({
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
      id, reference, order_status, address, delivery_landmark, client_instructions,
      volume_liters, quantity, total_amount_fcfa, payment_method,
      preferred_delivery_date, preferred_delivery_time, delivery_point,
      client_snapshot, zones (name)
    `)
    .eq('id', orderId)
    .eq('driver_id', user.id)
    .single<OrderDetail>();

  if (!order) notFound();

  const clientPhone = order.client_snapshot?.phone ?? '';
  const gpsCoords = parseDeliveryPoint(order.delivery_point);
  const mapsUrl = gpsCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${gpsCoords}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.zones?.name ?? 'Libreville')}+${encodeURIComponent(order.address)}`;

  return (
    <div className="space-y-5">
      <Link href="/" className="text-sm text-white/70 hover:text-white">
        ← Ma tournée
      </Link>

      {/* En-tête commande */}
      <header className="rounded-lg bg-white/5 p-5">
        <p className="font-mono text-[10px] uppercase tracking-widest text-white/50">
          {order.reference}
        </p>
        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
          {order.quantity} × {order.volume_liters} L
        </h1>
        <p className="mt-1 text-sm text-white/70">
          {order.zones?.name}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200">
            {ORDER_STATUS_LABELS[order.order_status]}
          </span>
          <span className="ml-auto font-display text-lg font-bold text-accent">
            {formatFcfa(order.total_amount_fcfa)}
          </span>
        </div>
      </header>

      {/* Contact — numéro uniquement (anonymisation) */}
      {clientPhone && (
        <section className="space-y-3 rounded-lg bg-white/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/50">Contact</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent">
              <PhoneIcon className="h-5 w-5" />
            </span>
            <a
              href={`tel:${clientPhone}`}
              className="text-lg font-semibold text-accent underline"
            >
              {formatGabonPhoneDisplay(clientPhone, { pretty: true })}
            </a>
          </div>
        </section>
      )}

      {/* Adresse */}
      <section className="space-y-3 rounded-lg bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Livraison
        </p>
        <div className="flex items-start gap-3">
          <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="flex-1 min-w-0">
            <p className="whitespace-pre-wrap text-sm">{order.address}</p>
            {order.delivery_landmark && (
              <p className="mt-1 text-xs text-white/60">Repère : {order.delivery_landmark}</p>
            )}
            {gpsCoords && (
              <p className="mt-1 text-xs text-accent">
                📍 Position GPS précise disponible
              </p>
            )}
          </div>
        </div>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-700"
        >
          Itinéraire dans Maps
        </a>
        {(order.preferred_delivery_date || order.preferred_delivery_time) && (
          <div className="flex items-center gap-3 border-t border-white/10 pt-3">
            <ClockIcon className="h-5 w-5 text-white/60" />
            <p className="text-sm text-white/80">
              Créneau souhaité : {order.preferred_delivery_date ?? ''} {order.preferred_delivery_time ?? ''}
            </p>
          </div>
        )}
        {order.client_instructions && (
          <div className="rounded bg-white/5 p-3">
            <p className="text-xs uppercase tracking-widest text-white/50">Instructions client</p>
            <p className="mt-1 text-sm">{order.client_instructions}</p>
          </div>
        )}
      </section>

      {/* Récap */}
      <section className="rounded-lg bg-white/5 p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/50">
          Récapitulatif
        </p>
        <div className="mt-3 flex items-center gap-3">
          <DropletIcon className="h-5 w-5 text-accent" />
          <p className="text-sm">
            {order.quantity} cuve{order.quantity > 1 ? 's' : ''} de {order.volume_liters} L
          </p>
        </div>
        <p className="mt-2 text-xs text-white/60">
          Paiement : {paymentLabels[order.payment_method] ?? order.payment_method}
        </p>
      </section>

      {/* Actions statut — collant en bas */}
      <div className="sticky bottom-4 z-20">
        <StatusActions orderId={order.id} currentStatus={order.order_status} />
      </div>
    </div>
  );
}
