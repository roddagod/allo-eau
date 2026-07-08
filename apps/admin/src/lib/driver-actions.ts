'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { createAdminClient } from '@eaupourtous/db/admin';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sendSms, normalizeGabonPhone } from './sms';

export type ActionResult = { ok: boolean; message?: string; driverId?: string };

/**
 * Crée un nouveau livreur.
 *   1. Crée l'auth.user avec un mot de passe temporaire aléatoire
 *   2. Le trigger DB `handle_new_auth_user` crée le profile (role='client')
 *   3. Le server action promeut à role='driver' + insère drivers row
 *      (via session_replication_role côté SQL n'est pas nécessaire ici car
 *      le service_role bypass les triggers de RLS et de anti-escalation)
 *   4. Envoie le mot de passe par SMS
 */
export async function createDriverAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const firstName  = String(formData.get('firstName') ?? '').trim();
  const lastName   = String(formData.get('lastName') ?? '').trim();
  const phoneRaw   = String(formData.get('phone') ?? '').trim();
  const email      = String(formData.get('email') ?? '').trim();
  const companyId  = String(formData.get('companyId') ?? '').trim();
  const primaryZoneId = String(formData.get('primaryZoneId') ?? '').trim() || null;

  if (!firstName || !lastName) return { ok: false, message: 'Prénom et nom requis.' };
  if (!phoneRaw)   return { ok: false, message: 'Téléphone requis.' };
  if (!companyId)  return { ok: false, message: 'Société d’attache requise.' };
  const phone = normalizeGabonPhone(phoneRaw);
  if (!phone) return { ok: false, message: 'Numéro de téléphone invalide (format Gabon).' };

  // Email fallback : <phone>@driver.allo-eau.ga (les livreurs se connectent souvent par email même s'ils n'en ont pas)
  const finalEmail = email || `${phone}@driver.allo-eau.ga`;
  const tempPassword = generateTempPassword();

  const admin = createAdminClient();

  // 1) Auth user
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email: finalEmail,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (authErr || !created.user) {
    return { ok: false, message: `Création auth échouée : ${authErr?.message ?? 'inconnu'}` };
  }
  const newUserId = created.user.id;

  // 2) Update profile (le trigger a créé le profile en 'client')
  const { error: profErr } = await admin
    .from('profiles')
    .update({
      role: 'driver',
      first_name: firstName,
      last_name:  lastName,
      phone,
      email: finalEmail,
      company_id: companyId,
      primary_zone_id: primaryZoneId,
      status: 'active',
    })
    .eq('id', newUserId);
  if (profErr) return { ok: false, message: `Profile : ${profErr.message}` };

  // 3) Insert drivers row (référence AE-XXX auto-générée)
  const { error: drvErr } = await admin
    .from('drivers')
    .insert({
      id: newUserId,
      company_id: companyId,
      primary_zone_id: primaryZoneId,
      status: 'off_duty',
      max_concurrent_orders: 3,
    });
  if (drvErr) return { ok: false, message: `Drivers : ${drvErr.message}` };

  // 4) SMS avec les credentials
  const driverAppUrl = (process.env.NEXT_PUBLIC_DRIVER_URL || 'https://livreur.allo-eau.ga').replace(/\/$/, '');
  await sendSms({
    to: phone,
    text: `Allo Eau : votre compte livreur est cree. Connexion sur ${driverAppUrl} - email ${finalEmail} - mdp ${tempPassword}`,
  });

  // 5) Log
  await admin.from('logs').insert({
    user_id: user.id,
    action: 'driver.create',
    module: 'drivers',
    description: `Nouveau livreur ${firstName} ${lastName} (${phone})`,
    company_id: companyId,
    target_id: newUserId,
    is_sensitive: true,
    metadata: { email: finalEmail, phone },
  });

  revalidatePath('/livreurs');
  redirect('/livreurs');
}

/**
 * Édition d'un livreur — prénom, nom, téléphone, société, zone principale.
 * Le rôle et le statut ne sont pas modifiables ici (suspend/reactivate à part).
 */
export async function updateDriverAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const driverId  = String(formData.get('driverId') ?? '').trim();
  const firstName = String(formData.get('firstName') ?? '').trim();
  const lastName  = String(formData.get('lastName') ?? '').trim();
  const phoneRaw  = String(formData.get('phone') ?? '').trim();
  const companyId = String(formData.get('companyId') ?? '').trim();
  const primaryZoneId = String(formData.get('primaryZoneId') ?? '').trim() || null;

  if (!driverId)  return { ok: false, message: 'Livreur invalide.' };
  if (!firstName || !lastName) return { ok: false, message: 'Prénom et nom requis.' };
  if (!companyId) return { ok: false, message: 'Société d’attache requise.' };
  const phone = normalizeGabonPhone(phoneRaw);
  if (!phone) return { ok: false, message: 'Numéro de téléphone invalide (format Gabon).' };

  const admin = createAdminClient();

  const { error: profErr } = await admin
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      company_id: companyId,
      primary_zone_id: primaryZoneId,
    })
    .eq('id', driverId);
  if (profErr) return { ok: false, message: `Profile : ${profErr.message}` };

  const { error: drvErr } = await admin
    .from('drivers')
    .update({ company_id: companyId, primary_zone_id: primaryZoneId })
    .eq('id', driverId);
  if (drvErr) return { ok: false, message: `Drivers : ${drvErr.message}` };

  await admin.from('logs').insert({
    user_id: user.id,
    action: 'driver.update',
    module: 'drivers',
    description: `Édition livreur ${firstName} ${lastName}`,
    company_id: companyId,
    target_id: driverId,
    is_sensitive: true,
  });

  revalidatePath(`/livreurs/${driverId}`);
  revalidatePath('/livreurs');
  return { ok: true, driverId };
}

/**
 * Suspendre un livreur (retire des dispatchs futurs).
 * On ne touche pas à ses commandes en cours — l'admin doit les réaffecter
 * manuellement s'il le souhaite.
 */
export async function suspendDriverAction(driverId: string): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('drivers')
    .update({ status: 'suspended' })
    .eq('id', driverId);
  if (error) return { ok: false, message: error.message };

  await admin.from('logs').insert({
    user_id: user.id,
    action: 'driver.suspend',
    module: 'drivers',
    description: 'Suspension livreur',
    target_id: driverId,
    is_sensitive: true,
  });

  revalidatePath(`/livreurs/${driverId}`);
  revalidatePath('/livreurs');
  revalidatePath('/carte');
  return { ok: true };
}

/**
 * Réactiver un livreur suspendu (retourne à off_duty par défaut,
 * il devra basculer lui-même en 'available' depuis son app).
 */
export async function reactivateDriverAction(driverId: string): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  const admin = createAdminClient();
  const { error } = await admin
    .from('drivers')
    .update({ status: 'off_duty' })
    .eq('id', driverId);
  if (error) return { ok: false, message: error.message };

  await admin.from('logs').insert({
    user_id: user.id,
    action: 'driver.reactivate',
    module: 'drivers',
    description: 'Réactivation livreur',
    target_id: driverId,
    is_sensitive: true,
  });

  revalidatePath(`/livreurs/${driverId}`);
  revalidatePath('/livreurs');
  return { ok: true };
}

/**
 * Passer un livreur en mode supervisé (ou l'inverse).
 * Un livreur supervised ne met plus à jour ses statuts lui-même : c'est le
 * gestionnaire de territoire attaché qui le fait à sa place.
 */
export async function setDriverSupervisionAction(
  driverId: string,
  mode: 'autonomous' | 'supervised',
  territoryManagerId: string | null,
): Promise<ActionResult> {
  const supabase = await createServerClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user) return { ok: false, message: 'Session expirée.' };

  if (mode === 'supervised' && !territoryManagerId) {
    return { ok: false, message: 'Un gestionnaire de territoire doit être désigné pour un livreur supervisé.' };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from('drivers')
    .update({
      supervision_mode: mode,
      territory_manager_id: mode === 'autonomous' ? null : territoryManagerId,
    } as never)
    .eq('id', driverId);
  if (error) return { ok: false, message: error.message };

  await admin.from('logs').insert({
    user_id: user.id,
    action: 'driver.set_supervision',
    module: 'drivers',
    description: `Mode ${mode}${territoryManagerId ? ' (gestionnaire ' + territoryManagerId.slice(0, 8) + ')' : ''}`,
    target_id: driverId,
    is_sensitive: true,
  });

  revalidatePath(`/livreurs/${driverId}`);
  revalidatePath('/livreurs');
  return { ok: true };
}

function generateTempPassword(): string {
  // 12 caractères alphanumériques sans confusion (0/O/l/1/I)
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let s = '';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}
