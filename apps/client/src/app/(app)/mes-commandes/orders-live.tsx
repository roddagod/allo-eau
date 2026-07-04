'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@eaupourtous/db/browser';

/**
 * Abonnement Realtime aux commandes du client courant.
 * Rafraîchit la page dès qu'un statut change (accepté, en route, livré, …).
 */
export function OrdersLive({ clientId }: { clientId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel(`client-orders-${clientId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `client_id=eq.${clientId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, router]);

  return null;
}
