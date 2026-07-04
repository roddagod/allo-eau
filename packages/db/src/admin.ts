import { createClient } from '@supabase/supabase-js';
import type { Database } from './generated';

/**
 * Client Supabase avec service_role — bypass RLS.
 * À N'UTILISER QUE côté serveur (Route Handlers, Server Actions, Edge Functions).
 * Jamais dans un composant client ni en variable exposée au bundle client.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
