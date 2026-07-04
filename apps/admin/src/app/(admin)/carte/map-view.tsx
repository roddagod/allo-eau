'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import maplibregl, { Map, Marker, type LngLatLike } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
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

// Centre initial : Libreville
const LIBREVILLE_CENTER: LngLatLike = [9.4536, 0.4162];

export function MapView({ markers }: { markers: OrderMarker[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [selected, setSelected] = useState<OrderMarker | null>(null);

  useEffect(() => {
    if (!container.current || mapRef.current) return;

    // Style OSM raster (gratuit, sans clé) — suffisant pour v1
    // Migration future : Protomaps PMTiles vector
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
      markerRefs.current = [];
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Nettoie les markers précédents
    for (const m of markerRefs.current) m.remove();
    markerRefs.current = [];

    for (const marker of markers) {
      const el = document.createElement('div');
      el.style.cssText = `
        width: 20px; height: 20px; border-radius: 50%;
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

      el.addEventListener('click', () => setSelected(marker));
      markerRefs.current.push(m);
    }

    // Fit bounds si plusieurs points
    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      for (const m of markers) bounds.extend([m.lng, m.lat]);
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 0 });
    } else if (markers.length === 1) {
      map.setCenter([markers[0]!.lng, markers[0]!.lat]);
      map.setZoom(14);
    }
  }, [markers]);

  const formatFcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(n)} FCFA`;

  return (
    <div className="relative">
      <div ref={container} className="h-[calc(100dvh-260px)] min-h-[420px] w-full" />

      {/* Panel de détail */}
      {selected && (
        <aside className="absolute inset-x-3 bottom-3 z-10 rounded-lg bg-white p-4 shadow-lg sm:inset-x-auto sm:left-3 sm:w-80">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                {selected.reference}
              </p>
              <p className="mt-1 font-semibold text-ink">{selected.summary}</p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {selected.companyName ?? 'En attente d’attribution'}
                {selected.zoneName && <> · {selected.zoneName}</>}
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
              style={{ backgroundColor: STATUS_COLOR[selected.status] }}
              aria-hidden
            />
            <span className="text-xs font-medium text-ink">{selected.statusLabel}</span>
            <span className="ml-auto text-sm font-bold text-primary">
              {formatFcfa(selected.totalFcfa)}
            </span>
          </div>
          <p className="mt-3 truncate text-xs text-ink-muted">{selected.address}</p>
          <Link
            href={`/commandes/${selected.id}`}
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Ouvrir la commande
          </Link>
        </aside>
      )}
    </div>
  );
}
