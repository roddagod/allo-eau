'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import maplibregl, { Map, Marker, type LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createBrowserClient } from '@eaupourtous/db/browser';
import type { OrderStatus } from '@eaupourtous/domain/order-status';

export type OrderMarker = {
  id: string;
  reference: string;
  lng: number;
  lat: number;
  status: OrderStatus;
  statusLabel: string;
  totalFcfa: number;
  summary: string;
  address: string;
  companyName: string | null;
  zoneName: string | null;
};

export type DriverStatus = 'available' | 'on_delivery' | 'off_duty' | 'suspended';

export type DriverMarker = {
  id: string;
  reference: string | null;
  name: string;
  phone: string | null;
  lng: number;
  lat: number;
  status: DriverStatus;
  statusLabel: string;
  companyName: string | null;
  activeOrders: number;
  updatedAgoMin: number | null;
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  pending:         '#1F3480',
  accepted:        '#3A5199',
  refused:         '#B91C1C',
  slot_confirmed:  '#3A5199',
  driver_assigned: '#B45309',
  driver_en_route: '#B45309',
  arrived_nearby:  '#B45309',
  delivered:       '#047857',
  cancelled:       '#64748B',
  incident:        '#B91C1C',
};

const DRIVER_COLOR: Record<DriverStatus, string> = {
  available:   '#009E60',
  on_delivery: '#B45309',
  off_duty:    '#94A3B8',
  suspended:   '#B91C1C',
};

const LIBREVILLE_CENTER: LngLatLike = [9.4536, 0.4162];

type SelectedItem =
  | { kind: 'order'; data: OrderMarker }
  | { kind: 'driver'; data: DriverMarker };

export function MapView({
  orders,
  drivers,
}: {
  orders: OrderMarker[];
  drivers: DriverMarker[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const orderMarkersRef = useRef<Marker[]>([]);
  const driverMarkersRef = useRef<Marker[]>([]);
  const [selected, setSelected] = useState<SelectedItem | null>(null);
  const [showDrivers, setShowDrivers] = useState(true);
  const [showOrders, setShowOrders] = useState(true);
  const router = useRouter();

  // Init map
  useEffect(() => {
    if (!container.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: LIBREVILLE_CENTER,
      zoom: 11,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: false }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }));

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      orderMarkersRef.current = [];
      driverMarkersRef.current = [];
    };
  }, []);

  // Order markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of orderMarkersRef.current) m.remove();
    orderMarkersRef.current = [];
    if (!showOrders) return;

    for (const marker of orders) {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 18px; height: 18px; border-radius: 50%;
        background: ${STATUS_COLOR[marker.status]};
        border: 3px solid white;
        box-shadow: 0 2px 6px rgba(15,23,42,0.25);
        cursor: pointer;
      `;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Commande ${marker.reference}`);

      const m = new maplibregl.Marker({ element: el })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);

      el.addEventListener('click', () => setSelected({ kind: 'order', data: marker }));
      orderMarkersRef.current.push(m);
    }
  }, [orders, showOrders]);

  // Driver markers (rendu distinct : plus grand, avec pastille de statut)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    for (const m of driverMarkersRef.current) m.remove();
    driverMarkersRef.current = [];
    if (!showDrivers) return;

    for (const marker of drivers) {
      const el = document.createElement('div');
      el.style.cssText = `
        position: relative; width: 28px; height: 28px;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
      `;
      el.innerHTML = `
        <div style="
          width: 28px; height: 28px; border-radius: 50%;
          background: ${DRIVER_COLOR[marker.status]};
          border: 3px solid white;
          box-shadow: 0 4px 10px rgba(15,23,42,0.35);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 17h4V5H2v12h3"/>
            <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/>
            <circle cx="7.5" cy="17.5" r="2.5"/>
            <circle cx="17.5" cy="17.5" r="2.5"/>
          </svg>
        </div>
        ${marker.status === 'available' || marker.status === 'on_delivery'
          ? `<span style="
              position: absolute; top: -2px; right: -2px;
              width: 10px; height: 10px; border-radius: 50%;
              background: ${DRIVER_COLOR[marker.status]};
              border: 2px solid white;
              animation: pulse 2s infinite;
            "></span>`
          : ''
        }
      `;
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', `Livreur ${marker.name}`);

      const m = new maplibregl.Marker({ element: el, anchor: 'center' })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);

      el.addEventListener('click', () => setSelected({ kind: 'driver', data: marker }));
      driverMarkersRef.current.push(m);
    }
  }, [drivers, showDrivers]);

  // Fit bounds initial
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: [number, number][] = [
      ...orders.map((o) => [o.lng, o.lat] as [number, number]),
      ...drivers.map((d) => [d.lng, d.lat] as [number, number]),
    ];
    if (pts.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      for (const p of pts) bounds.extend(p);
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    } else if (pts.length === 1) {
      map.setCenter(pts[0]!);
      map.setZoom(14);
    }
  }, [orders.length, drivers.length]);

  // Realtime — refresh RSC quand un livreur bouge ou une commande change (throttled 15 s)
  useEffect(() => {
    const supabase = createBrowserClient();
    let lastRefresh = Date.now();
    const REFRESH_THROTTLE_MS = 15_000;

    const refresh = () => {
      const now = Date.now();
      if (now - lastRefresh < REFRESH_THROTTLE_MS) return;
      lastRefresh = now;
      router.refresh();
    };

    const channel = supabase
      .channel('map-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'drivers' }, refresh)
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'orders'  }, refresh)
      .subscribe();

    // Refresh périodique de secours toutes les 30 s
    const interval = setInterval(() => router.refresh(), 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [router]);

  const formatFcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

  return (
    <div className="relative">
      <div ref={container} className="h-[calc(100dvh-260px)] min-h-[420px] w-full" />

      {/* Toggles couches */}
      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 rounded-lg bg-white p-2 shadow-lg">
        <label className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-ink">
          <input
            type="checkbox"
            checked={showDrivers}
            onChange={(e) => setShowDrivers(e.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Livreurs ({drivers.length})
        </label>
        <label className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-ink">
          <input
            type="checkbox"
            checked={showOrders}
            onChange={(e) => setShowOrders(e.target.checked)}
            className="h-3.5 w-3.5 accent-primary"
          />
          Commandes ({orders.length})
        </label>
      </div>

      {/* Panel de détail */}
      {selected?.kind === 'order' && (
        <aside className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-white p-4 shadow-lg sm:inset-x-auto sm:left-3 sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                {selected.data.reference}
              </p>
              <p className="mt-1 font-semibold text-ink">{selected.data.summary}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {selected.data.companyName ?? 'En attente d’attribution'}
                {selected.data.zoneName && <> · {selected.data.zoneName}</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-ink-subtle hover:text-ink"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: STATUS_COLOR[selected.data.status] }}
              aria-hidden
            />
            <span className="text-xs font-medium text-ink">{selected.data.statusLabel}</span>
            <span className="ml-auto text-sm font-bold text-primary">
              {formatFcfa(selected.data.totalFcfa)}
            </span>
          </div>
          <p className="mt-3 truncate text-xs text-ink-muted">{selected.data.address}</p>
          <Link
            href={`/commandes/${selected.data.id}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Ouvrir la commande
          </Link>
        </aside>
      )}

      {selected?.kind === 'driver' && (
        <aside className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-white p-4 shadow-lg sm:inset-x-auto sm:left-3 sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                {selected.data.reference ?? 'AE-???'}
              </p>
              <p className="mt-1 font-semibold text-ink">{selected.data.name}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {selected.data.companyName ?? '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-ink-subtle hover:text-ink"
              aria-label="Fermer"
            >
              ×
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: DRIVER_COLOR[selected.data.status] }}
              aria-hidden
            />
            <span className="text-xs font-medium text-ink">{selected.data.statusLabel}</span>
            <span className="ml-auto text-xs font-semibold text-ink-muted">
              {selected.data.activeOrders} en cours
            </span>
          </div>
          {selected.data.phone && (
            <a
              href={`tel:${selected.data.phone}`}
              className="mt-2 block truncate text-xs font-medium text-primary underline"
            >
              {selected.data.phone}
            </a>
          )}
          <p className="mt-2 text-[11px] text-ink-subtle">
            {selected.data.updatedAgoMin === null
              ? 'Position non transmise'
              : selected.data.updatedAgoMin === 0
                ? 'Position à l’instant'
                : `Position il y a ${selected.data.updatedAgoMin} min`}
          </p>
        </aside>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%   { transform: scale(1);   opacity: 1; }
          50%  { transform: scale(1.6); opacity: 0.5; }
          100% { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
