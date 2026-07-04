import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@eaupourtous/db/server';
import { CompanyStatusPanel } from './status-panel';
import { CompanyZonesPanel } from './zones-panel';

type Company = {
  id: string;
  commercial_name: string;
  legal_name: string | null;
  rccm: string | null;
  operator_type: 'private' | 'military' | 'municipal';
  address: string | null;
  manager_name: string | null;
  phone: string | null;
  email: string | null;
  status: 'pending_validation' | 'active' | 'suspended' | 'rejected' | 'deactivated';
  average_delay_minutes: number | null;
  success_rate: number | null;
  orders_count: number | null;
  dispatch_mode: 'auto' | 'manual' | 'override';
};

type Zone = { id: string; name: string; sector: string | null };

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const [{ data: company }, { data: zonesData }, { data: assigned }] = await Promise.all([
    supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single<Company>(),
    supabase
      .from('zones')
      .select('id, name, sector')
      .order('sector')
      .order('name')
      .returns<Zone[]>(),
    supabase
      .from('company_zones')
      .select('zone_id')
      .eq('company_id', id)
      .returns<{ zone_id: string }[]>(),
  ]);

  if (!company) notFound();
  const assignedIds = new Set((assigned ?? []).map((a) => a.zone_id));

  return (
    <div>
      <header className="mb-6">
        <Link href="/societes" className="text-sm text-slate-600 hover:text-gabon-green">
          ← Toutes les sociétés
        </Link>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{company.commercial_name}</h1>
        {company.legal_name && (
          <p className="mt-1 text-sm text-slate-600">{company.legal_name}</p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne infos */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold text-slate-700">Informations</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-widest text-slate-500">Type d’opérateur</dt>
              <dd className="mt-0.5 text-slate-800">
                {company.operator_type === 'private' && 'Opérateur privé'}
                {company.operator_type === 'military' && 'Opérateur militaire'}
                {company.operator_type === 'municipal' && 'Opérateur public'}
              </dd>
            </div>
            {company.rccm && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">RCCM / Identifiant</dt>
                <dd className="mt-0.5 text-slate-800">{company.rccm}</dd>
              </div>
            )}
            {company.manager_name && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">Responsable</dt>
                <dd className="mt-0.5 text-slate-800">{company.manager_name}</dd>
              </div>
            )}
            {company.phone && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">Téléphone</dt>
                <dd className="mt-0.5 text-slate-800">{company.phone}</dd>
              </div>
            )}
            {company.email && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">Email</dt>
                <dd className="mt-0.5 break-all text-slate-800">{company.email}</dd>
              </div>
            )}
            {company.address && (
              <div>
                <dt className="text-xs uppercase tracking-widest text-slate-500">Adresse</dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-slate-800">{company.address}</dd>
              </div>
            )}
            <div className="border-t border-slate-100 pt-3">
              <dt className="text-xs uppercase tracking-widest text-slate-500">Commandes traitées</dt>
              <dd className="mt-0.5 text-slate-800">{company.orders_count ?? 0}</dd>
            </div>
          </dl>
        </section>

        <div className="space-y-6 lg:col-span-2">
          <CompanyStatusPanel
            companyId={company.id}
            currentStatus={company.status}
            commercialName={company.commercial_name}
          />

          <CompanyZonesPanel
            companyId={company.id}
            zones={zonesData ?? []}
            assignedIds={Array.from(assignedIds)}
          />
        </div>
      </div>
    </div>
  );
}
