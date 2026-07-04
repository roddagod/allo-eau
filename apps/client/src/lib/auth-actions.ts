'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { clientSignUpSchema } from '@eaupourtous/domain/schemas';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export type ActionState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

async function origin(): Promise<string> {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') ?? 'http';
  const host = h.get('host') ?? 'localhost:3000';
  return `${proto}://${host}`;
}

// ----------------------------------------------------------------------------
// signIn — email + password
// ----------------------------------------------------------------------------
export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, message: 'Email et mot de passe requis.' };
  }

  const supabase = await createServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { ok: false, message: 'Email ou mot de passe incorrect.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

// ----------------------------------------------------------------------------
// signUp — création complète d'un compte client
// ----------------------------------------------------------------------------
export async function signUpAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = clientSignUpSchema.safeParse({
    firstName:     formData.get('firstName'),
    lastName:      formData.get('lastName'),
    phone:         formData.get('phone'),
    email:         formData.get('email'),
    password:      formData.get('password'),
    primaryZoneId: formData.get('primaryZoneId'),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.');
      if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: 'Vérifiez les champs.', fieldErrors };
  }

  const input = parsed.data;
  const supabase = await createServerClient();

  // 1) Création du compte auth — trigger DB crée automatiquement le profile (role=client)
  const { data: signUp, error: signUpError } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { emailRedirectTo: `${await origin()}/auth/callback` },
  });

  if (signUpError || !signUp.user) {
    return { ok: false, message: signUpError?.message ?? 'Erreur lors de la création du compte.' };
  }

  // 2) Complète le profile avec les informations client
  //    L'adresse détaillée est demandée à la première commande.
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      first_name:      input.firstName,
      last_name:       input.lastName,
      phone:           input.phone,
      primary_zone_id: input.primaryZoneId,
    })
    .eq('id', signUp.user.id);

  if (profileError) {
    return { ok: false, message: 'Compte créé, mais échec de la mise à jour du profil.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

// ----------------------------------------------------------------------------
// signInWithGoogle — redirige vers l'OAuth Google
// ----------------------------------------------------------------------------
export async function signInWithGoogleAction(): Promise<void> {
  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${await origin()}/auth/callback` },
  });

  if (error || !data.url) {
    throw new Error(error?.message ?? 'Impossible de démarrer l’authentification Google.');
  }
  redirect(data.url);
}

// ----------------------------------------------------------------------------
// signOut
// ----------------------------------------------------------------------------
export async function signOutAction(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
