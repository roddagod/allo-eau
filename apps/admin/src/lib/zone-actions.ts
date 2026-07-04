'use server';

import { createServerClient } from '@eaupourtous/db/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type ActionResult = { ok: boolean; message?: string; zoneId?: string };

const SECTORS = ['Nord', 'Centre', 'Est', 'Sud', 'Autre'] as const;
type Sector = (typeof SECTORS)[number];

/** Crée un nouveau quartier. */
export async function createZoneAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();
  const name   = String(formData.get('name') ?? '').trim();
  const sector = String(formData.get('sector') ?? '').trim();
  const status = String(formData.get('status') ?? 'active') as 'active' | 'draft' | 'inactive';

  if (!name)   return { ok: false, message: 'Le nom du quartier est requis.' };
  if (!SECTORS.includes(sector as Sector)) return { ok: false, message: 'Secteur invalide.' };

  const { error } = await supabase
    .from('zones')
    .insert({ name, sector, status });

  if (error) return { ok: false, message: error.message };

  revalidatePath('/zones');
  redirect('/zones');
}

/** Édite un quartier. */
export async function updateZoneAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createServerClient();
  const id     = String(formData.get('id') ?? '');
  const name   = String(formData.get('name') ?? '').trim();
  const sector = String(formData.get('sector') ?? '').trim();
  const status = String(formData.get('status') ?? 'active') as 'active' | 'draft' | 'inactive';

  if (!id || !name) return { ok: false, message: 'ID et nom requis.' };
  if (!SECTORS.includes(sector as Sector)) return { ok: false, message: 'Secteur invalide.' };

  const { error } = await supabase
    .from('zones')
    .update({ name, sector, status })
    .eq('id', id);

  if (error) return { ok: false, message: error.message };
  revalidatePath('/zones');
  return { ok: true };
}
