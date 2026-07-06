import { createServerClient } from '@eaupourtous/db/server';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';
import { MapView, type OrderMarker, type DriverMarker, type DriverStatus } from './map-view';

export const metadata = { title: 'Carte des opérations — Administration' };
export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  total_amount_fcfa: number;
  volume_liters: number;
  quantity: number;
  address: string;
  delivery_point: string | null;
  companies: { commercial_name: string } | null;
  zones: { name: string } | null;
};

type DriverRow = {
  id: string;
  reference: string | null;
  status: DriverStatus;
  current_location: string | null;
  location_updated_at: string | null;
  companies: { commercial_name: string } | null;
  profile: { first_name: string | null; last_name: string | null; phone: string | null } | null;
};

const DRIVER_STATUS_LABEL: Record<DriverStatus, string> = {
  available:   'Disponible',
  on_delivery: 'En livraison',
  off_duty:    'Hors service',
  suspended:   'Suspendu',
};

function parseWkt(wkt: string | null): [number, number] | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

export default async function CartePage() {
  const supabase = await createServerClient();

  const [ordersRes, driversRes, activeCountsRes] = await Promise.all([
    supabase
      .from('orders')
      .select(`
        id, reference, order_status, total_amount_fcfa, volume_liters, quantity,
        address, delivery_point,
        companies (commercial_name),
        zones (name)
      `)
      .not('delivery_point', 'is', null)
      .not('order_status', 'in', '(delivered,cancelled)')
      .order('created_at', { ascending: false })
      .limit(500)
      .returns<OrderRow[]>(),
    supabase
      .from('drivers')
      .select(`
        id, reference, status, current_location, location_updated_at,
        companies (commercial_name),
        profile:profiles!drivers_id_fkey (first_name, last_name, phone)
      `)
      .not('current_location', 'is', null)
      .returns<DriverRow[]>(),
    supabase
      .from('orders')
      .select('driver_id')
      .not('driver_id', 'is', null)
      .in('order_status', ['driver_assigned', 'driver_en_route', 'arrived_nearby'])
      .returns<{ driver_id: string }[]>(),
  ]);

  const activeCounts = new Map<string, number>();
  for (const row of activeCountsRes.data ?? []) {
    activeCounts.set(row.driver_id, (activeCounts.get(row.driver_id) ?? 0) + 1);
  }

  const orderMarkers: OrderMarker[] = (ordersRes.data ?? [])
    .map((o) => {
      const coord = parseWkt(o.delivery_point);
      if (!coord) return null;
      return {
        id: o.id,
        reference: o.reference,
        lng: coord[0],
        lat: coord[1],
        status: o.order_status,
        statusLabel: ORDER_STATUS_LABELS[o.order_status],
        totalFcfa: o.total_amount_fcfa,
        summary: `${o.quantity} × ${o.volume_liters} L`,
        address: o.address,
        companyName: o.companies?.commercial_name ?? null,
        zoneName: o.zones?.name ?? null,
      } satisfies OrderMarker;
    })
    .filter((m): m is OrderMarker => m !== null);

  const now = Date.now();
  const driverMarkers: DriverMarker[] = (driversRes.data ?? [])
    .map((d) => {
      const coord = parseWkt(d.current_location);
      if (!coord) return null;
      const name = [d.profile?.first_name, d.profile?.last_name].filter(Boolean).join(' ') || 'Livreur';
      const updatedAgoMin = d.location_updated_at
        ? Math.max(0, Math.round((now - new Date(d.location_updated_at).getTime()) / 60_000))
        : null;
      return {
        id: d.id,
        reference: d.reference,
        name,
        phone: d.profile?.phone ?? null,
        lng: coord[0],
        lat: coord[1],
        status: d.status,
        statusLabel: DRIVER_STATUS_LABEL[d.status],
        companyName: d.companies?.commercial_name ?? null,
        activeOrders: activeCounts.get(d.id) ?? 0,
        updatedAgoMin,
      } satisfies DriverMarker;
    })
    .filter((m): m is DriverMarker => m !== null);

  const availableDrivers = driverMarkers.filter((d) => d.status === 'available').length;
  const onDeliveryDrivers = driverMarkers.filter((d) => d.status === 'on_delivery').length;

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Opérations en direct</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Carte des opérations</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {orderMarkers.length} commande{orderMarkers.length > 1 ? 's' : ''} active{orderMarkers.length > 1 ? 's' : ''} ·{' '}
          {driverMarkers.length} livreur{driverMarkers.length > 1 ? 's' : ''} géolocalisé{driverMarkers.length > 1 ? 's' : ''}
          {' '}({availableDrivers} disponible{availableDrivers > 1 ? 's' : ''}, {onDeliveryDrivers} en livraison)
        </p>
      </header>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <MapView orders={orderMarkers} drivers={driverMarkers} />
      </div>

      {/* Légendes */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-subtle">Livreurs</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { color: '#009E60', label: 'Disponible' },
              { color: '#B45309', label: 'En livraison' },
              { color: '#94A3B8', label: 'Hors service' },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} aria-hidden />
                <span className="text-ink-muted">{l.label}</span>
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-subtle">Commandes</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {[
              { color: '#1F3480', label: 'En attente' },
              { color: '#3A5199', label: 'Acceptée' },
              { color: '#B45309', label: 'En livraison' },
              { color: '#B91C1C', label: 'Incident' },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} aria-hidden />
                <span className="text-ink-muted">{l.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
