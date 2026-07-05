'use client';

import { useEffect } from 'react';
import { pushDriverPositionAction } from '@/lib/order-actions';

/**
 * Tracker GPS livreur — invisible.
 *  - Écoute `navigator.geolocation.watchPosition` avec highAccuracy
 *  - N'appelle le serveur que si la nouvelle position s'écarte de plus de 25 m
 *    de la dernière envoyée (ou après 60 s), pour économiser batterie et data.
 */
export function GpsTracker({ driverId }: { driverId: string }) {
  useEffect(() => {
    if (!navigator.geolocation) return;

    let lastSent: { lat: number; lng: number; at: number } | null = null;

    // Haversine simplifiée en mètres (suffisant pour < 1 km)
    const distanceM = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
      const R = 6_371_000;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const s =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) *
          Math.cos((b.lat * Math.PI) / 180) *
          Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
    };

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const cur = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const now = Date.now();
        const shouldSend =
          !lastSent ||
          now - lastSent.at > 60_000 ||
          distanceM(cur, lastSent) > 25;
        if (!shouldSend) return;
        lastSent = { ...cur, at: now };
        void pushDriverPositionAction(driverId, {
          lat: cur.lat,
          lng: cur.lng,
          accuracyM: pos.coords.accuracy ?? 0,
        });
      },
      () => {
        // Permission refusée / erreur — silencieux
      },
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [driverId]);

  return null;
}
