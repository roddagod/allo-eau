'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { createOrderSchema } from '@eaupourtous/domain/schemas';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type OrderActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Création d'une commande côté client.
 *
 * Le client ne choisit PAS la société : la plateforme dispatche automatiquement
 * (trigger DB `on_order_insert_dispatch`), la société valide, cascade sur refus.
 *
 * Le trigger `snapshot_order_price` calcule prix unitaire + version tarifaire + total.
 * Le trigger `generate_order_reference` génère `EPL-YYYY-NNNNNN`.
 */
export async function createOrderAction(
  _prev: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) {
    return { ok: false, message: 'Session expirée. Reconnectez-vous.' };
  }

  const raw = {
    zoneId:                formData.get('zoneId'),
    address:               formData.get('address'),
    deliveryLandmark:      formData.get('deliveryLandmark') || undefined,
    volumeLiters:          Number(formData.get('volumeLiters')),
    quantity:              Number(formData.get('quantity')),
    paymentMethod:         formData.get('paymentMethod'),
    preferredDeliveryDate: formData.get('preferredDeliveryDate') || undefined,
    preferredDeliveryTime: formData.get('preferredDeliveryTime') || undefined,
    clientInstructions:    formData.get('clientInstructions') || undefined,
  };

  const parsed = createOrderSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: 'Vérifiez les champs.', fieldErrors };
  }

  const input = parsed.data;

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      client_id:               user.id,
      created_by_user_id:      user.id,
      // company_id volontairement omis : le trigger de dispatch l'attribue
      zone_id:                 input.zoneId,
      address:                 input.address,
      delivery_landmark:       input.deliveryLandmark ?? null,
      volume_liters:           input.volumeLiters,
      quantity:                input.quantity,
      payment_method:          input.paymentMethod,
      preferred_delivery_date: input.preferredDeliveryDate ?? null,
      preferred_delivery_time: input.preferredDeliveryTime ?? null,
      client_instructions:     input.clientInstructions ?? null,
    })
    .select('id, reference')
    .single<{ id: string; reference: string }>();

  if (error || !order) {
    console.error('createOrder error', error);
    return { ok: false, message: error?.message ?? 'Impossible de créer la commande.' };
  }

  revalidatePath('/mes-commandes');
  redirect(`/mes-commandes/${order.id}`);
}
