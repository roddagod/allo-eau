import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { DropletIcon, TagIcon } from '@/components/icons';
import { NewPriceVersionPanel } from './new-version-panel';

export const dynamic = 'force-dynamic';

type Tier = {
  id: string;
  volume_liters: number;
  label: string;
  display_order: number;
  active: boolean;
};

type Version = {
  id: string;
  tier_id: string;
  price_fcfa: number;
  valid_from: string;
  valid_to: string | null;
  reason: string;
  reference_doc: string | null;
  created_at: string;
};

type CurrentPrice = {
  tier_id: string;
  price_fcfa: number;
  valid_from: string;
  reason: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default async function TarifsPage() {
  const user = await getUser();
  const isSuperAdmin = user?.profile.role === 'super_admin';

  const supabase = await createServerClient();
  const [{ data: tiers }, { data: versions }, { data: current }] = await Promise.all([
    supabase
      .from('price_tiers')
      .select('id, volume_liters, label, display_order, active')
      .eq('active', true)
      .order('display_order')
      .returns<Tier[]>(),
    supabase
      .from('price_versions')
      .select('id, tier_id, price_fcfa, valid_from, valid_to, reason, reference_doc, created_at')
      .order('valid_from', { ascending: false })
      .returns<Version[]>(),
    supabase
      .from('current_prices')
      .select('tier_id, price_fcfa, valid_from, reason')
      .returns<CurrentPrice[]>(),
  ]);

  const tiersList = tiers ?? [];
  const versionsList = versions ?? [];
  const currentByTier = new Map((current ?? []).map((c) => [c.tier_id, c]));

  const versionsByTier = new Map<string, Version[]>();
  for (const v of versionsList) {
    if (!versionsByTier.has(v.tier_id)) versionsByTier.set(v.tier_id, []);
    versionsByTier.get(v.tier_id)!.push(v);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Régulation
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Tarifs officiels</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Prix réglementés, versionnés et historisés. Toute modification est journalisée.
          </p>
        </div>
        {!isSuperAdmin && (
          <span className="rounded-full bg-surface-muted px-3 py-1 text-xs text-ink-subtle">
            Lecture seule — réservé super administrateur
          </span>
        )}
      </header>

      {/* Prix courants */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-subtle">
          En vigueur actuellement
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {tiersList.map((t) => {
            const c = currentByTier.get(t.id);
            return (
              <article key={t.id} className="rounded-lg bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
                    <DropletIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-ink-subtle">Cuve</p>
                    <p className="text-sm font-bold text-ink">{t.label}</p>
                  </div>
                </div>
                <p className="mt-4 font-display text-3xl font-bold text-primary">
                  {c ? formatFcfa(c.price_fcfa) : '—'}
                </p>
                {c && (
                  <p className="mt-2 text-xs text-ink-subtle">
                    En vigueur depuis le {formatDate(c.valid_from)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-ink-subtle">
          Livraison incluse. Aucune majoration par quartier, distance ou horaire.
        </p>
      </section>

      {/* Nouvelle version — super admin */}
      {isSuperAdmin && <NewPriceVersionPanel tiers={tiersList} />}

      {/* Historique */}
      <section>
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-subtle">
          Historique des versions
        </p>
        <div className="space-y-4">
          {tiersList.map((t) => {
            const hist = versionsByTier.get(t.id) ?? [];
            const currentId = currentByTier.get(t.id) ? hist.find((v) => v.valid_to === null)?.id : null;
            return (
              <div key={t.id} className="overflow-hidden rounded-lg bg-white shadow-sm">
                <div className="border-b border-surface-border px-5 py-3">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <TagIcon className="h-4 w-4 text-primary" />
                      <p className="text-sm font-bold text-ink">{t.label}</p>
                    </div>
                    <p className="text-xs text-ink-subtle">
                      {hist.length} version{hist.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <ul className="divide-y divide-surface-border">
                  {hist.length === 0 ? (
                    <li className="px-5 py-4 text-sm text-ink-subtle">Aucune version enregistrée.</li>
                  ) : (
                    hist.map((v) => {
                      const isCurrent = v.id === currentId;
                      return (
                        <li
                          key={v.id}
                          className={
                            'px-5 py-4 ' + (isCurrent ? 'bg-accent-50' : '')
                          }
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <div className="flex items-baseline gap-3">
                              <span
                                className={
                                  'font-display text-2xl font-bold ' +
                                  (isCurrent ? 'text-accent-700' : 'text-ink')
                                }
                              >
                                {formatFcfa(v.price_fcfa)}
                              </span>
                              {isCurrent && (
                                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-white">
                                  En vigueur
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-ink-muted">
                              Du {formatDate(v.valid_from)}
                              {v.valid_to && <> au {formatDate(v.valid_to)}</>}
                            </p>
                          </div>
                          <p className="mt-2 text-sm text-ink-muted">{v.reason}</p>
                          {v.reference_doc && (
                            <p className="mt-1 text-xs text-ink-subtle">
                              {v.reference_doc.startsWith('http') ? (
                                <a
                                  href={v.reference_doc}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary underline"
                                >
                                  Consulter la source
                                </a>
                              ) : (
                                <span>Réf. : {v.reference_doc}</span>
                              )}
                            </p>
                          )}
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
