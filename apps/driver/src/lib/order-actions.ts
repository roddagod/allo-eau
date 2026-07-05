'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = { ok: boolean; message?: string };

type DriverTransition = 'driver_en_route' | 'arrived_nearby' | 'delivered' | 'incident';

/**
 * Met à jour le statut d'une commande depuis l'app livreur.
 * Le livreur ne peut modifier que ses propres commandes (RLS
 * `orders_update_driver` : `driver_id = auth.uid()`).
 */
export async function updateOrderStatusAction(
  orderId: string,
  status: DriverTransition,
  extra?: { incidentType?: string; incidentDetails?: string },
): Promise<ActionResult> {
  const supabase = await createServerClient();

  const { error } = await supabase
    .from('orders')
    .update({
      order_status:        status,
      incident_type:       status === 'incident'  ? (extra?.incidentType ?? null)    : undefined,
      incident_details:    status === 'incident'  ? (extra?.incidentDetails ?? null) : undefined,
      actual_delivered_at: status === 'delivered' ? new Date().toISOString()          : undefined,
    })
    .eq('id', orderId);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/commande/${orderId}`);
  revalidatePath('/');
  return { ok: true };
}

/**
 * Push d'une position GPS. Alimente `drivers.current_location` +
 * `driver_position_history`.
 */
export async function pushDriverPositionAction(
  driverId: string,
  point: { lat: number; lng: number; accuracyM: number },
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const wkt = `POINT(${point.lng} ${point.lat})`;
  const nowIso = new Date().toISOString();

  const [{ error: e1 }, { error: e2 }] = await Promise.all([
    supabase
      .from('drivers')
      .update({
        current_location:    wkt as unknown as never,
        location_source:     'gps',
        location_updated_at: nowIso,
      })
      .eq('id', driverId),
    supabase.from('driver_position_history').insert({
      driver_id: driverId,
      location:  wkt as unknown as never,
      accuracy_m: Math.round(point.accuracyM),
      recorded_at: nowIso,
    }),
  ]);

  if (e1 || e2) return { ok: false, message: e1?.message ?? e2?.message ?? 'Erreur' };
  return { ok: true };
}

/**
 * Statut livreur (available / on_delivery / off_duty).
 */
export async function setDriverStatusAction(
  driverId: string,
  status: 'available' | 'on_delivery' | 'off_duty',
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { error } = await supabase.from('drivers').update({ status }).eq('id', driverId);
  if (error) return { ok: false, message: error.message };
  revalidatePath('/');
  return { ok: true };
}
