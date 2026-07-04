import { createServerClient } from '@eaupourtous/db/server';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';
import { MapView, type OrderMarker } from './map-view';

export const metadata = { title: 'Carte des commandes — Administration' };
export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  total_amount_fcfa: number;
  volume_liters: number;
  quantity: number;
  address: string;
  delivery_point: string | null; // WKT format from PostGIS
  companies: { commercial_name: string } | null;
  zones: { name: string } | null;
};

/** Parse "POINT(lng lat)" ou "SRID=4326;POINT(lng lat)" en tuple [lng, lat] */
function parseWkt(wkt: string | null): [number, number] | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

export default async function CartePage() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('orders')
    .select(`
      id, reference, order_status, total_amount_fcfa, volume_liters, quantity,
      address, delivery_point,
      companies (commercial_name),
      zones (name)
    `)
    .not('delivery_point', 'is', null)
    .order('created_at', { ascending: false })
    .limit(500)
    .returns<Row[]>();

  const markers: OrderMarker[] = (data ?? [])
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

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Opérations</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Carte des commandes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          {markers.length} commande{markers.length > 1 ? 's' : ''} géolocalisée{markers.length > 1 ? 's' : ''} sur les 500 dernières.
        </p>
      </header>

      <div className="overflow-hidden rounded-lg bg-white shadow-sm">
        <MapView markers={markers} />
      </div>

      {/* Légende */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {[
          { key: 'pending',         color: '#1F3480', label: 'En attente / attribution' },
          { key: 'accepted',        color: '#3A5199', label: 'Acceptée' },
          { key: 'driver_en_route', color: '#B45309', label: 'En livraison' },
          { key: 'delivered',       color: '#047857', label: 'Livrée' },
          { key: 'incident',        color: '#B91C1C', label: 'Incident' },
        ].map((l) => (
          <span key={l.key} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} aria-hidden />
            <span className="text-ink-muted">{l.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
