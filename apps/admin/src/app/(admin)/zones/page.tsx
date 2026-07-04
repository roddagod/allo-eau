import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { ArrowRightIcon, MapIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

type ZoneRow = { id: string; name: string; sector: string | null; status: string; created_at: string };
type CountRow = { zone_id: string };

const statusPill: Record<string, string> = {
  active:   'bg-accent-50 text-accent-700',
  draft:    'bg-amber-100 text-amber-800',
  inactive: 'bg-surface-muted text-ink-subtle',
};

const statusLabel: Record<string, string> = {
  active:   'Active',
  draft:    'Brouillon',
  inactive: 'Inactive',
};

export default async function ZonesListPage() {
  const supabase = await createServerClient();
  const [{ data: zones }, { data: coverage }] = await Promise.all([
    supabase.from('zones')
      .select('id, name, sector, status, created_at')
      .order('sector').order('name')
      .returns<ZoneRow[]>(),
    supabase.from('company_zones').select('zone_id').returns<CountRow[]>(),
  ]);

  const list = zones ?? [];
  const coverageMap = new Map<string, number>();
  for (const c of coverage ?? []) coverageMap.set(c.zone_id, (coverageMap.get(c.zone_id) ?? 0) + 1);

  const bySector = list.reduce<Record<string, ZoneRow[]>>((acc, z) => {
    const s = z.sector ?? 'Autre';
    (acc[s] ??= []).push(z);
    return acc;
  }, {});

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Territoires</p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Quartiers</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {list.length} quartier(s) enregistré(s), {list.filter((z) => z.status === 'active').length} actif(s).
          </p>
        </div>
        <Link
          href="/zones/nouveau"
          className="inline-flex min-h-touch items-center justify-center gap-2 rounded-lg bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-700"
        >
          Nouveau quartier
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </header>

      <div className="space-y-6">
        {Object.entries(bySector).map(([sector, zonesInSector]) => (
          <section key={sector} className="rounded-lg bg-white shadow-sm">
            <div className="border-b border-surface-border px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-ink-subtle">
                Secteur {sector} · {zonesInSector.length} quartier{zonesInSector.length > 1 ? 's' : ''}
              </p>
            </div>
            <ul className="divide-y divide-surface-border">
              {zonesInSector.map((z) => {
                const nbCompanies = coverageMap.get(z.id) ?? 0;
                return (
                  <li key={z.id}>
                    <Link
                      href={`/zones/${z.id}`}
                      className="flex items-center gap-4 px-5 py-3 hover:bg-surface-muted"
                    >
                      <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary">
                        <MapIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink">{z.name}</p>
                        <p className="text-xs text-ink-subtle">
                          {nbCompanies === 0 ? 'Aucune société' : `${nbCompanies} société${nbCompanies > 1 ? 's' : ''}`}
                        </p>
                      </div>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusPill[z.status]}`}>
                        {statusLabel[z.status] ?? z.status}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
