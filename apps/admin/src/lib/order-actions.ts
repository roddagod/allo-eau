'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = { ok: boolean; message?: string; assignedCompanyId?: string | null };

/**
 * Réassignation manuelle par un admin/superviseur.
 * Appelle la fonction DB `dispatch_order(order_id, forced_company_id, actor)`
 * qui journalise et gère le mode `manual` / `override`.
 *
 * Si forcedCompanyId est NULL, on retente une attribution auto (utile pour
 * les commandes bloquées en awaiting_dispatch).
 */
export async function reassignOrderAction(
  orderId: string,
  forcedCompanyId: string | null,
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const { data, error } = await supabase.rpc('dispatch_order', {
    p_order_id: orderId,
    p_forced_company_id: forcedCompanyId ?? undefined,
    p_actor: user.id,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  if (data === null) {
    return {
      ok: false,
      message: 'Aucune société éligible. Activez une société qui couvre le quartier.',
    };
  }

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath('/commandes');
  revalidatePath('/');
  return { ok: true, assignedCompanyId: data as string };
}

/**
 * Accepter une commande (au nom de la société, action admin).
 */
export async function acceptOrderAction(orderId: string): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('orders')
    .update({ order_status: 'accepted' })
    .eq('id', orderId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/commandes/${orderId}`);
  revalidatePath('/commandes');
  return { ok: true };
}

/**
 * Réaffectation manuelle à un livreur spécifique.
 * Écrase l'auto-assign : si l'admin veut donner la commande à un livreur précis,
 * on met `driver_id` et on passe le statut à `driver_assigned` si nécessaire.
 * Une entrée est écrite dans `logs` pour traçabilité.
 */
export async function reassignOrderToDriverAction(
  orderId: string,
  driverId: string,
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  // Récupère la commande + la société attendue du livreur (vérif cohérence)
  const [{ data: order }, { data: driver }] = await Promise.all([
    supabase
      .from('orders')
      .select('id, company_id, driver_id, order_status')
      .eq('id', orderId)
      .single<{ id: string; company_id: string | null; driver_id: string | null; order_status: string }>(),
    supabase
      .from('drivers')
      .select('id, company_id, status, reference')
      .eq('id', driverId)
      .single<{ id: string; company_id: string; status: string; reference: string | null }>(),
  ]);

  if (!order) return { ok: false, message: 'Commande introuvable.' };
  if (!driver) return { ok: false, message: 'Livreur introuvable.' };
  if (driver.status === 'suspended') {
    return { ok: false, message: 'Ce livreur est suspendu.' };
  }
  if (order.company_id && order.company_id !== driver.company_id) {
    return {
      ok: false,
      message: 'Ce livreur n’appartient pas à la société attribuée à la commande.',
    };
  }

  // Statuts terminaux : refus
  if (['delivered', 'cancelled', 'refused'].includes(order.order_status)) {
    return { ok: false, message: 'Commande déjà cloturée.' };
  }

  const shouldBumpStatus = order.order_status === 'accepted' || order.order_status === 'pending';

  const { error: updErr } = await supabase
    .from('orders')
    .update({
      driver_id: driverId,
      order_status: shouldBumpStatus ? 'driver_assigned' : undefined,
    })
    .eq('id', orderId);
  if (updErr) return { ok: false, message: updErr.message };

  await supabase.from('logs').insert({
    user_id: user.id,
    action: 'order.assign_driver',
    module: 'orders',
    description: `Réaffectation manuelle au livreur ${driver.reference ?? driverId}`,
    target_id: orderId,
    company_id: driver.company_id,
    is_sensitive: true,
  });

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath('/commandes');
  revalidatePath('/carte');
  return { ok: true };
}

/**
 * Modifier la priorité d'une commande (hôpital, école, incident, etc.).
 * Justifiée par un `reason` obligatoire dès qu'on sort de 'normal'.
 */
export async function setOrderPriorityAction(
  orderId: string,
  priority: 'normal' | 'high' | 'critical',
  reason: 'hospital' | 'school' | 'vulnerable' | 'incident' | 'ministerial' | 'other' | null,
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  if (priority !== 'normal' && !reason) {
    return { ok: false, message: 'Un motif est requis pour toute priorité supérieure à normale.' };
  }

  const { error } = await supabase
    .from('orders')
    .update({
      priority,
      priority_reason: priority === 'normal' ? null : reason,
    } as never)
    .eq('id', orderId);
  if (error) return { ok: false, message: error.message };

  await supabase.from('logs').insert({
    user_id: user.id,
    action: 'order.set_priority',
    module: 'orders',
    description: `Priorité passée à ${priority}${reason ? ` (${reason})` : ''}`,
    target_id: orderId,
    is_sensitive: true,
  });

  revalidatePath(`/commandes/${orderId}`);
  revalidatePath('/commandes');
  revalidatePath('/');
  return { ok: true };
}

/**
 * Refuser une commande (déclenche le trigger de cascade côté DB).
 */
export async function refuseOrderAction(
  orderId: string,
  reason: string,
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from('orders')
    .update({ order_status: 'refused', refusal_reason: reason })
    .eq('id', orderId);
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/commandes/${orderId}`);
  revalidatePath('/commandes');
  return { ok: true };
}
