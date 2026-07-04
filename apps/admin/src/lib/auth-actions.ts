'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionState = {
  ok: boolean;
  message?: string;
};

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) {
    return { ok: false, message: 'Email et mot de passe requis.' };
  }

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { ok: false, message: 'Identifiants invalides.' };
  }

  // Vérifie le rôle avant de laisser entrer
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', data.user.id)
    .single<{ role: string; status: string }>();

  const allowed = ['admin', 'super_admin', 'supervisor', 'company_owner', 'company_operator'];
  if (!profile || !allowed.includes(profile.role)) {
    await supabase.auth.signOut();
    return { ok: false, message: 'Accès réservé au personnel habilité.' };
  }
  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    return { ok: false, message: 'Ce compte n’est pas actif. Contactez un administrateur.' };
  }

  revalidatePath('/', 'layout');
  redirect('/');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createServerClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
