'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';

export type ActionResult = { ok: boolean; message?: string };

/**
 * Change le statut d'une société. Réservé admin/super_admin (RLS l'enforce).
 * Journalise l'action comme sensible.
 */
export async function setCompanyStatusAction(
  companyId: string,
  status: 'active' | 'suspended' | 'rejected' | 'deactivated',
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const { data: current } = await supabase
    .from('companies')
    .select('id, commercial_name, status')
    .eq('id', companyId)
    .single<{ id: string; commercial_name: string; status: string }>();
  if (!current) return { ok: false, message: 'Société introuvable.' };

  const { error } = await supabase
    .from('companies')
    .update({ status })
    .eq('id', companyId);
  if (error) return { ok: false, message: error.message };

  await supabase.from('logs').insert({
    user_id:      user.id,
    action:       `company.${status}`,
    module:       'companies',
    description:  `Société ${current.commercial_name} passée de ${current.status} à ${status}`,
    company_id:   companyId,
    target_id:    companyId,
    is_sensitive: true,
    metadata:     { previous_status: current.status, new_status: status },
  });

  revalidatePath(`/societes/${companyId}`);
  revalidatePath('/societes');
  return { ok: true };
}

/**
 * Redéfinit la liste des zones couvertes par une société (remplace tout).
 */
export async function setCompanyZonesAction(
  companyId: string,
  zoneIds: string[],
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  // Nettoyage
  const { error: delError } = await supabase
    .from('company_zones')
    .delete()
    .eq('company_id', companyId);
  if (delError) return { ok: false, message: delError.message };

  if (zoneIds.length > 0) {
    const { error: insError } = await supabase
      .from('company_zones')
      .insert(zoneIds.map((zone_id) => ({ company_id: companyId, zone_id })));
    if (insError) return { ok: false, message: insError.message };
  }

  await supabase.from('logs').insert({
    user_id:     user.id,
    action:      'company.zones_updated',
    module:      'companies',
    description: `${zoneIds.length} zone(s) couverte(s) par la société`,
    company_id:  companyId,
    target_id:   companyId,
    metadata:    { zone_count: zoneIds.length },
  });

  revalidatePath(`/societes/${companyId}`);
  return { ok: true };
}
