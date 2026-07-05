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
  const driverAppUrl = (process.env.NEXT_PUBLIC_DRIVER_URL ?? 'https://livreur.allo-eau.ga').replace(/\/$/, '');
  await sendSms({
    to: phone,
    text: `Allo Eau : votre compte livreur est cree. Connexion sur ${driverAppUrl.replace(/^https?:\/\//, '')} - email ${finalEmail} - mdp ${tempPassword}`,
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

function generateTempPassword(): string {
  // 12 caractères alphanumériques sans confusion (0/O/l/1/I)
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let s = '';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += chars[b % chars.length];
  return s;
}
