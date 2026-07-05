'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionState = { ok: boolean; message?: string };

export async function signInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email    = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { ok: false, message: 'Email et mot de passe requis.' };

  const supabase = await createServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { ok: false, message: 'Identifiants invalides.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', data.user.id)
    .single<{ role: string; status: string }>();

  if (!profile || profile.role !== 'driver') {
    await supabase.auth.signOut();
    return { ok: false, message: 'Accès réservé aux livreurs.' };
  }
  if (profile.status !== 'active') {
    await supabase.auth.signOut();
    return { ok: false, message: 'Compte non actif. Contactez votre société.' };
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
