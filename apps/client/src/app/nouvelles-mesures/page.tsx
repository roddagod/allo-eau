import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { PublicHeader } from '@/components/public-header';
import {
  DropletIcon,
  PhoneIcon,
  ShieldIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  ClockIcon,
} from '@/components/icons';

export const metadata = {
  title: 'Les nouvelles mesures — Allô Eau',
  description:
    'Communiqués officiels du Ministère de l’Accès Universel à l’Eau et à l’Énergie sur l’état d’urgence hydrique dans le Grand Libreville : tarifs officiels, numéros verts, dispositif de distribution.',
};
export const dynamic = 'force-dynamic';

type CurrentPrice = {
  tier_id: string;
  volume_liters: number;
  label: string;
  display_order: number;
  price_fcfa: number;
};

async function fetchPrices(): Promise<CurrentPrice[]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from('current_prices')
    .select('tier_id, volume_liters, label, display_order, price_fcfa')
    .order('display_order')
    .returns<CurrentPrice[]>();
  return data ?? [];
}

// Numéros verts officiels — Communiqué N°2 du 02/07/2026
const HOTLINES = [
  { name: 'Corps des Sapeurs-Pompiers', number: '18',  role: 'Distribution' },
  { name: 'Génie Militaire',            number: '181', role: 'Distribution' },
  { name: 'Garde Républicaine',         number: '182', role: 'Distribution' },
  { name: 'Gendarmerie Nationale',      number: '183', role: 'Distribution' },
  {
    name: 'Ministère de l’Accès Universel à l’Eau',
    number: '184',
    role: 'Non-respect tarifs',
    special: true,
  },
] as const;

const COMMUNIQUES = [
  {
    number: 'N°1',
    date: '01 juillet 2026',
    title: 'Déclaration de l’état d’urgence hydrique',
    highlights: [
      'Arraisonnement de 55 véhicules de livraison par les Forces de Défense et de Sécurité',
      'Suspension provisoire de la commercialisation d’eau (article 159, loi 011/23)',
      'Mise en place d’un numéro vert unique pour signaler les besoins',
    ],
  },
  {
    number: 'N°2',
    date: '02 juillet 2026',
    title: 'Révision des tarifs et élargissement du dispositif',
    highlights: [
      'Tarifs officiels revus après consultations avec les propriétaires des véhicules immobilisés',
      'Livraison assurée conjointement par les Forces de Défense et de Sécurité et les opérateurs privés homologués',
      '5 numéros verts opérationnels depuis le 3 juillet 2026 à 7h',
      'Dispense des taxes régulièrement prélevées par les mairies, transports et commerce',
    ],
  },
];

export default async function NouvellesMesuresPage() {
  const prices = await fetchPrices();

  return (
    <div className="min-h-dvh bg-surface-muted">
      <PublicHeader />

      <main id="main">
        {/* Hero */}
        <section className="bg-primary text-white">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <p className="text-xs font-semibold uppercase tracking-widest text-accent">
              Communiqués officiels du Ministère
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              Les nouvelles mesures
            </h1>
            <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">
              Ensemble des dispositions prises par le Gouvernement dans le cadre de l’état
              d’urgence hydrique déclaré pour le Grand Libreville.
            </p>
          </div>
        </section>

        {/* Communiqués */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Historique
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                Les deux communiqués de presse
              </h2>
            </div>

            <div className="mt-8 space-y-6">
              {COMMUNIQUES.map((c) => (
                <article
                  key={c.number}
                  className="rounded-2xl border border-surface-border bg-white p-6"
                >
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                      Communiqué {c.number}
                    </span>
                    <span className="text-xs font-medium text-ink-subtle">{c.date}</span>
                  </div>
                  <h3 className="mt-3 text-lg font-bold text-ink">{c.title}</h3>
                  <ul className="mt-4 space-y-2 text-sm text-ink-muted">
                    {c.highlights.map((h) => (
                      <li key={h} className="flex gap-3">
                        <span
                          className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="mt-6 text-xs text-ink-subtle">
              Source : Cabinet du Ministre de l’Accès Universel à l’Eau et à l’Énergie —
              Bâtiment C, Immeuble La Perla, Impasse 1235 V Pont de Gué Gué, Libreville.
            </p>
          </div>
        </section>

        {/* Tarifs officiels en vigueur */}
        <section className="border-t border-surface-border bg-primary-50">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                En vigueur depuis le 02/07/2026
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">
                Tarifs officiels
              </h2>
              <p className="mt-2 text-sm text-ink-muted">
                Ces tarifs annulent et remplacent ceux du 1er juillet 2026. Aucune majoration par
                quartier, distance ou horaire.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {prices.map((p) => (
                <article
                  key={p.tier_id}
                  className="flex flex-col rounded-2xl border border-surface-border bg-white p-5"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
                      <DropletIcon className="h-5 w-5" />
                    </span>
                    <p className="text-xs font-medium uppercase tracking-widest text-ink-subtle">
                      Cuve
                    </p>
                  </div>
                  <p className="mt-4 text-base font-bold text-ink">{p.label}</p>
                  <p className="mt-1 text-2xl font-bold text-primary">
                    {formatFcfa(p.price_fcfa)}
                  </p>
                  <p className="mt-2 text-xs text-ink-subtle">Livraison incluse</p>
                </article>
              ))}
            </div>

            <p className="mt-6 max-w-2xl text-xs text-ink-subtle">
              Les tarifs entraînent la dispense des taxes régulièrement prélevées par les mairies,
              les transports et le commerce.
            </p>
          </div>
        </section>

        {/* Numéros verts */}
        <section className="border-t border-surface-border bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Assistance
              </p>
              <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">Cinq numéros verts</h2>
              <p className="mt-2 text-sm text-ink-muted">
                Opérationnels 24h/24 depuis le vendredi 3 juillet 2026 à 7h. Appel gratuit depuis
                un mobile.
              </p>
            </div>

            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {HOTLINES.map((h) => (
                <li key={h.number}>
                  <a
                    href={`tel:${h.number}`}
                    className={
                      'flex items-center gap-4 rounded-2xl border-2 p-4 transition-colors ' +
                      (h.special
                        ? 'border-danger-soft bg-danger-soft/50 hover:border-danger'
                        : 'border-primary-100 bg-white hover:border-primary')
                    }
                  >
                    <span
                      className={
                        'inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ' +
                        (h.special ? 'bg-danger text-white' : 'bg-primary text-white')
                      }
                      aria-hidden
                    >
                      <PhoneIcon className="h-6 w-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
                        {h.role}
                      </p>
                      <p className="mt-0.5 truncate text-sm font-medium text-ink">{h.name}</p>
                    </div>
                    <span
                      className={
                        'font-mono text-3xl font-bold ' +
                        (h.special ? 'text-danger' : 'text-primary')
                      }
                    >
                      {h.number}
                    </span>
                  </a>
                </li>
              ))}
            </ul>

            <p className="mt-6 max-w-2xl rounded-xl bg-surface-muted p-4 text-xs text-ink-muted">
              <span className="font-semibold text-ink">Bon à savoir —</span> le numéro{' '}
              <span className="font-mono font-bold">184</span> est réservé au signalement de
              tout non-respect des mesures tarifaires officielles. Pour commander de l’eau, utilisez
              les numéros 18, 181, 182 ou 183 selon l’opérateur.
            </p>
          </div>
        </section>

        {/* Dispositif */}
        <section className="border-t border-surface-border bg-primary-50">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-6 lg:grid-cols-3">
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <ShieldIcon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">Homologation</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  Les opérateurs privés doivent se rapprocher de la Direction Générale de l’Eau
                  pour se soumettre aux procédures d’homologation.
                </p>
              </div>
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white">
                  <ClockIcon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">Livraison 7j/7</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  L’activité de livraison est assurée conjointement par les Forces de Défense et de
                  Sécurité et les opérateurs privés homologués.
                </p>
              </div>
              <div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-danger text-white">
                  <AlertTriangleIcon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">Tolérance zéro</h3>
                <p className="mt-2 text-sm text-ink-muted">
                  Le Gouvernement de la République ne tolérera aucun abus en cette période de crise.
                  Signalez tout non-respect des mesures.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-surface-border bg-white">
          <div className="mx-auto max-w-4xl px-4 py-12 text-center sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Commandez maintenant</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-ink-muted">
              Passez commande depuis la plateforme officielle — avec ou sans compte.
            </p>
            <Link
              href="/commander"
              className="mt-6 inline-flex min-h-touch items-center justify-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-accent-700 focus-visible:outline-none"
            >
              Commander de l’eau
              <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
