'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@eaupourtous/db/browser';

/**
 * Rafraîchit la page dès que le statut ou tout champ de la commande change.
 */
export function OrderLive({ orderId }: { orderId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, router]);

  return null;
}
