import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';

type CompanyRow = {
  id: string;
  commercial_name: string;
  operator_type: 'private' | 'military' | 'municipal';
  status: string;
  orders_count: number | null;
  average_delay_minutes: number | null;
  success_rate: number | null;
};

const statusBadge: Record<string, string> = {
  pending_validation: 'bg-amber-100 text-amber-800',
  active:             'bg-emerald-100 text-emerald-800',
  suspended:          'bg-red-100 text-red-800',
  rejected:           'bg-slate-100 text-slate-600',
  deactivated:        'bg-slate-100 text-slate-500',
};

const statusLabel: Record<string, string> = {
  pending_validation: 'En attente',
  active:             'Active',
  suspended:          'Suspendue',
  rejected:           'Rejetée',
  deactivated:        'Désactivée',
};

const operatorLabel: Record<CompanyRow['operator_type'], string> = {
  private:   'Privé',
  military:  'Militaire',
  municipal: 'Public',
};

export default async function CompaniesPage() {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('companies')
    .select('id, commercial_name, operator_type, status, orders_count, average_delay_minutes, success_rate')
    .order('status')
    .order('commercial_name')
    .returns<CompanyRow[]>();

  const companies = data ?? [];

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Sociétés</h1>
        <p className="mt-1 text-sm text-slate-600">
          Validez, suspendez et attribuez les zones couvertes.
        </p>
      </header>

      {companies.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          Aucune société.
        </div>
      )}

      {/* Cartes empilées — mobile */}
      <ul className="space-y-3 md:hidden">
        {companies.map((c) => (
          <li key={c.id}>
            <Link
              href={`/societes/${c.id}`}
              className="block rounded-2xl border border-slate-200 bg-white p-4 hover:border-gabon-green"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{c.commercial_name}</p>
                  <p className="mt-0.5 text-xs uppercase tracking-widest text-slate-500">
                    {operatorLabel[c.operator_type]}
                  </p>
                </div>
                <span className={`whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium ${statusBadge[c.status]}`}>
                  {statusLabel[c.status] ?? c.status}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>{c.orders_count ?? 0} commandes</span>
                {c.average_delay_minutes != null && <span>Délai {c.average_delay_minutes} min</span>}
                {c.success_rate != null && <span>Fiabilité {Number(c.success_rate).toFixed(0)} %</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tableau — desktop */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3">Société</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Commandes</th>
              <th className="px-4 py-3">Délai</th>
              <th className="px-4 py-3">Fiabilité</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {companies.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">{c.commercial_name}</td>
                <td className="px-4 py-3 text-slate-700">{operatorLabel[c.operator_type]}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge[c.status]}`}>
                    {statusLabel[c.status] ?? c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{c.orders_count ?? 0}</td>
                <td className="px-4 py-3 text-slate-700">
                  {c.average_delay_minutes != null ? `${c.average_delay_minutes} min` : '—'}
                </td>
                <td className="px-4 py-3 text-slate-700">
                  {c.success_rate != null ? `${Number(c.success_rate).toFixed(0)} %` : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/societes/${c.id}`}
                    className="text-sm font-semibold text-gabon-green hover:underline"
                  >
                    Ouvrir →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
