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
