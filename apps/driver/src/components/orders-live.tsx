'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@eaupourtous/db/browser';

/**
 * Écoute Realtime les changements sur les commandes affectées au livreur
 * courant → refresh du RSC. Fluidifie la prise en charge : dès que la
 * société accepte une commande et que l'auto-dispatch me la donne, elle
 * apparaît dans ma tournée sans reload.
 */
export function OrdersLive({ driverId }: { driverId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`driver-orders-${driverId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `driver_id=eq.${driverId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, router]);

  return null;
}
