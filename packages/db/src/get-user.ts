import { createServerClient } from './server';

export type CurrentUser = {
  id: string;
  email: string | null;
  profile: {
    role: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    primaryZoneId: string | null;
    companyId: string | null;
    status: string;
  };
};

/**
 * Retourne l'utilisateur courant + son profil joint, ou null s'il n'est pas connecté.
 * À appeler depuis un Server Component ou un Route Handler.
 */
export async function getUser(): Promise<CurrentUser | null> {
  const supabase = await createServerClient();

  const { data: authData } = await supabase.auth.getUser();
  const authUser = authData.user;
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, first_name, last_name, phone, primary_zone_id, company_id, status')
    .eq('id', authUser.id)
    .single<{
      role: string;
      first_name: string | null;
      last_name: string | null;
      phone: string | null;
      primary_zone_id: string | null;
      company_id: string | null;
      status: string;
    }>();

  if (!profile) return null;

  return {
    id: authUser.id,
    email: authUser.email ?? null,
    profile: {
      role: profile.role,
      firstName: profile.first_name,
      lastName: profile.last_name,
      phone: profile.phone,
      primaryZoneId: profile.primary_zone_id,
      companyId: profile.company_id,
      status: profile.status,
    },
  };
}
