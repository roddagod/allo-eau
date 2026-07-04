'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionResult = { ok: boolean; message?: string; companyId?: string };

/**
 * Crée une nouvelle société. Réservé admin/super_admin.
 * Retourne l'ID pour redirection vers le détail.
 */
export async function createCompanyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const commercial_name = String(formData.get('commercial_name') ?? '').trim();
  const legal_name      = String(formData.get('legal_name') ?? '').trim() || null;
  const rccm            = String(formData.get('rccm') ?? '').trim() || null;
  const operator_type   = String(formData.get('operator_type') ?? 'private') as 'private' | 'military' | 'municipal';
  const address         = String(formData.get('address') ?? '').trim() || null;
  const manager_name    = String(formData.get('manager_name') ?? '').trim() || null;
  const phone           = String(formData.get('phone') ?? '').trim() || null;
  const email           = String(formData.get('email') ?? '').trim() || null;
  const activate        = formData.get('activate') === 'on';

  if (!commercial_name) return { ok: false, message: 'Le nom commercial est requis.' };

  const { data, error } = await supabase
    .from('companies')
    .insert({
      commercial_name,
      legal_name,
      rccm,
      operator_type,
      address,
      manager_name,
      phone,
      email,
      status: activate ? 'active' : 'pending_validation',
    })
    .select('id')
    .single<{ id: string }>();

  if (error || !data) return { ok: false, message: error?.message ?? 'Erreur inconnue.' };

  await supabase.from('logs').insert({
    user_id:      user.id,
    action:       'company.create',
    module:       'companies',
    description:  `Société "${commercial_name}" créée${activate ? ' (activée directement)' : ''}`,
    company_id:   data.id,
    target_id:    data.id,
    is_sensitive: activate,
  });

  revalidatePath('/societes');
  redirect(`/societes/${data.id}`);
}

/**
 * Édite les informations d'une société (nom, RCCM, contact, etc.).
 */
export async function updateCompanyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'ID manquant.' };

  const { error } = await supabase
    .from('companies')
    .update({
      commercial_name: String(formData.get('commercial_name') ?? '').trim(),
      legal_name:      String(formData.get('legal_name') ?? '').trim() || null,
      rccm:            String(formData.get('rccm') ?? '').trim() || null,
      address:         String(formData.get('address') ?? '').trim() || null,
      manager_name:    String(formData.get('manager_name') ?? '').trim() || null,
      phone:           String(formData.get('phone') ?? '').trim() || null,
      email:           String(formData.get('email') ?? '').trim() || null,
    })
    .eq('id', id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/societes/${id}`);
  revalidatePath('/societes');
  return { ok: true };
}

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
