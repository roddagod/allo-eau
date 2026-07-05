import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { DriverCreateForm } from './driver-create-form';

export const metadata = { title: 'Nouveau livreur — Administration' };
export const dynamic = 'force-dynamic';

type Company = { id: string; commercial_name: string };
type Zone = { id: string; name: string; sector: string | null };

export default async function NewDriverPage() {
  const user = await getUser();
  if (!user) return null;

  const supabase = await createServerClient();

  // Company_owner ne voit que sa propre société
  let companiesQuery = supabase.from('companies').select('id, commercial_name').order('commercial_name');
  if (user.profile.role === 'company_owner' && user.profile.companyId) {
    companiesQuery = companiesQuery.eq('id', user.profile.companyId);
  }
  const { data: companies } = await companiesQuery.returns<Company[]>();

  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, sector')
    .eq('status', 'active')
    .order('sector')
    .order('name')
    .returns<Zone[]>();

  return (
    <div>
      <Link href="/livreurs" className="text-sm font-medium text-ink-muted hover:text-primary">
        ← Retour aux livreurs
      </Link>
      <header className="mt-3 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Nouveau</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Créer un livreur</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Le compte est provisionné automatiquement et les identifiants sont envoyés par SMS.
        </p>
      </header>

      <div className="max-w-2xl rounded-lg bg-white p-5 shadow-sm sm:p-6">
        <DriverCreateForm
          companies={companies ?? []}
          zones={zones ?? []}
          defaultCompanyId={user.profile.companyId ?? ''}
        />
      </div>
    </div>
  );
}
