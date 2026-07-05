'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = { ok: boolean; message?: string };

/**
 * Crée une nouvelle version tarifaire pour un palier.
 * Réservé super_admin (RLS l'enforce). Le trigger DB
 * `on_price_version_insert` clôture automatiquement la précédente version
 * courante et journalise l'action comme sensible.
 */
export async function createPriceVersionAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const tierId       = String(formData.get('tier_id') ?? '');
  const priceFcfaRaw = String(formData.get('price_fcfa') ?? '');
  const validFromRaw = String(formData.get('valid_from') ?? '');
  const reason       = String(formData.get('reason') ?? '').trim();
  const referenceDoc = String(formData.get('reference_doc') ?? '').trim() || null;

  if (!tierId) return { ok: false, message: 'Palier requis.' };
  const priceFcfa = Number(priceFcfaRaw);
  if (!Number.isFinite(priceFcfa) || priceFcfa < 0) {
    return { ok: false, message: 'Prix invalide.' };
  }
  if (reason.length < 10) {
    return { ok: false, message: 'Motif requis (minimum 10 caractères).' };
  }
  // valid_from optionnel (défaut : maintenant)
  const validFrom = validFromRaw ? new Date(validFromRaw).toISOString() : new Date().toISOString();

  const { error } = await supabase.from('price_versions').insert({
    tier_id:       tierId,
    price_fcfa:    priceFcfa,
    valid_from:    validFrom,
    reason,
    reference_doc: referenceDoc,
    created_by:    user.id,
  });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/tarifs');
  revalidatePath('/');
  return { ok: true };
}
