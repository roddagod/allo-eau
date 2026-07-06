import Link from 'next/link';
import Image from 'next/image';
import { createServerClient } from '@eaupourtous/db/server';
import { getUser } from '@eaupourtous/db/get-user';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { BrandMark } from '@/components/brand/brand-mark';
import { PublicHeader } from '@/components/public-header';
import {
  DropletIcon,
  TruckIcon,
  PhoneIcon,
  MapPinIcon,
  ArrowRightIcon,
  AlertTriangleIcon,
  ShieldIcon,
} from '@/components/icons';

// Toujours re-fetcher les zones/tarifs à chaque requête
export const dynamic = 'force-dynamic';

type CurrentPrice = {
  tier_id: string;
  volume_liters: number;
  label: string;
  display_order: number;
  price_fcfa: number;
};

type ZoneRow = { id: string; name: string; sector: string | null };

async function fetchLandingData() {
  const supabase = await createServerClient();
  const [{ data: prices }, { data: zones }] = await Promise.all([
    supabase
      .from('current_prices')
      .select('tier_id, volume_liters, label, display_order, price_fcfa')
      .order('display_order')
      .returns<CurrentPrice[]>(),
    supabase
      .from('zones')
      .select('id, name, sector')
      .order('sector')
      .order('name')
      .returns<ZoneRow[]>(),
  ]);
  return { prices: prices ?? [], zones: zones ?? [] };
}

const MILITARY_PARTNERS = [
  { name: 'Corps des Sapeurs-Pompiers', hotline: '18'  },
  { name: 'Génie Militaire',            hotline: '181' },
  { name: 'Garde Républicaine',         hotline: '182' },
  { name: 'Gendarmerie Nationale',      hotline: '183' },
];

const STEPS = [
  {
    title: 'Créer un compte',
    text: 'Enregistrez votre nom, votre téléphone et votre quartier de livraison.',
  },
  {
    title: 'Passer votre commande',
    text: 'Choisissez le volume, la quantité et le créneau. La plateforme sélectionne pour vous une société qui livre votre quartier.',
  },
  {
    title: 'Recevoir la livraison',
    text: 'Recevez une notification à chaque étape : acceptation, départ du livreur, arrivée, paiement.',
  },
];

// ---------------------------------------------------------------------------

export default async function HomePage() {
  const [{ prices, zones }, user] = await Promise.all([fetchLandingData(), getUser()]);

  const zonesBySector = zones.reduce<Record<string, ZoneRow[]>>((acc, z) => {
    const s = z.sector ?? 'Autre';
    (acc[s] ??= []).push(z);
    return acc;
  }, {});

  return (
    <>
      {/* ===================== HEADER ===================== */}
      <PublicHeader />

      <main id="main">
        {/* ===================== HERO ===================== */}
        <section className="relative overflow-hidden bg-primary text-white">
          {/* Motif subtil — points diagonaux (imprim' institutionnelle, pas SaaS) */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255,255,255,1) 1px, transparent 0)',
              backgroundSize: '18px 18px',
            }}
          />

          {/* Barre officielle République Gabonaise */}
          <div className="relative border-b border-white/10">
            <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
              <span aria-hidden className="flex h-3.5 w-3.5 flex-col overflow-hidden rounded-[2px]">
                <span className="flex-1 bg-[#009E60]" />
                <span className="flex-1 bg-[#FCD116]" />
                <span className="flex-1 bg-[#3A75C4]" />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80 sm:text-xs">
                République Gabonaise
              </p>
              <span className="ml-auto flex items-center gap-1.5 text-[10px] font-medium text-white/60 sm:text-xs">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#FCD116]" />
                <span className="hidden sm:inline">État d’urgence hydrique · </span>
                <span>02 juillet 2026</span>
              </span>
            </div>
          </div>

          <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 sm:pt-14 lg:px-8 lg:pt-20 lg:pb-24">
            <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-16">
              <div className="max-w-2xl">
                {/* Titre principal — plus serré, plus imposant */}
                <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
                  De l’eau potable,
                  <br className="hidden sm:block" />
                  <span className="text-white">livrée à votre porte.</span>
                </h1>

                {/* Divider or */}
                <span aria-hidden className="mt-6 block h-[3px] w-14 rounded-full bg-[#FCD116]" />

                {/* Sous-titre — deux points d'ancrage clairs */}
                <p className="mt-6 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                  Livraison à tarif réglementé, assurée par les Forces de Défense et de Sécurité.
                </p>

                {/* CTAs */}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/commander"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-lg bg-accent px-6 text-base font-semibold text-white shadow-sm transition-colors hover:bg-accent-700 focus-visible:outline-none sm:min-h-[56px]"
                  >
                    Commander maintenant
                    <ArrowRightIcon className="h-5 w-5" />
                  </Link>
                  <Link
                    href="/nouvelles-mesures"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-lg border border-white/25 px-6 text-base font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none sm:min-h-[56px]"
                  >
                    Mesures officielles
                  </Link>
                </div>
              </div>

              {/* Cartouche officielle — logo Ministère sur fond blanc net */}
              <aside
                className="order-first mx-auto flex w-fit shrink-0 items-center justify-center rounded-lg bg-white p-4 shadow-lg sm:p-5 lg:order-none lg:mx-0"
                aria-label="Ministère de l’Accès Universel à l’Eau et à l’Énergie"
              >
                <Image
                  src="/institution/ministere-eau-energie.png"
                  alt="Ministère de l’Accès Universel à l’Eau et à l’Énergie — République Gabonaise"
                  width={361}
                  height={326}
                  priority
                  sizes="(min-width: 1024px) 220px, 160px"
                  className="h-auto w-40 lg:w-[220px]"
                />
              </aside>
            </div>
          </div>
        </section>

        {/* ===================== COMMENT ÇA MARCHE ===================== */}
        <section id="comment" className="border-b border-primary-100 bg-primary-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                En trois étapes
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Un dispositif simple et transparent
              </h2>
              <p className="mt-4 text-base text-slate-600 sm:text-lg">
                Pas d’appels multiples, pas de négociation : la plateforme attribue automatiquement votre commande à l’opérateur qui livre votre quartier.
              </p>
            </div>

            <ol className="mt-12 grid gap-6 sm:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title} className="rounded-lg border border-slate-200 bg-white p-6">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-lg font-bold text-white">
                    {i + 1}
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ===================== TARIFS ===================== */}
        <section id="tarifs" className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Tarifs officiels
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Prix réglementés, livraison incluse
              </h2>
              <p className="mt-4 text-base text-slate-600 sm:text-lg">
                Les tarifs sont fixés par décret dans le cadre de l’état d’urgence hydrique.
                Aucune majoration par quartier, par distance ou par horaire.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {prices.map((p) => (
                <article
                  key={p.tier_id}
                  className="flex flex-col rounded-lg border border-slate-200 bg-white p-6"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
                      <DropletIcon className="h-6 w-6" />
                    </span>
                    <p className="text-sm font-medium uppercase tracking-widest text-slate-500">
                      Cuve
                    </p>
                  </div>
                  <p className="mt-4 text-lg font-bold text-slate-900">{p.label}</p>
                  <p className="mt-2 text-3xl font-bold text-primary">
                    {formatFcfa(p.price_fcfa)}
                  </p>
                  <p className="mt-3 text-xs text-slate-500">Livraison incluse</p>
                </article>
              ))}
            </div>

            <p className="mt-6 max-w-3xl text-xs text-slate-500">
              Le tarif de la cuve de 1 000 L a été fixé à 4 000 FCFA par le dispositif d’urgence
              hydrique. Les tarifs des autres paliers restent en cours de validation par le
              ministère.
            </p>
          </div>
        </section>

        {/* ===================== ZONES ===================== */}
        <section
          id="zones"
          className="relative overflow-hidden border-b border-surface-border bg-white bg-cover bg-bottom bg-no-repeat"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #FFFFFF 0%, rgba(255,255,255,0.95) 40%, rgba(255,255,255,0.55) 100%), url(/maplbv.webp)',
          }}
        >
          <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            {/* Header */}
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Grand Libreville
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Un maillage de {zones.length} quartiers desservis
              </h2>
              <p className="mt-2 text-sm text-ink-muted sm:text-base">
                Le dispositif couvre progressivement l’estuaire, organisé en secteurs logistiques.
              </p>
            </div>

            {/* Stats — bande compacte */}
            <dl className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-x-8 gap-y-2 rounded-lg bg-white px-6 py-3 shadow-sm">
              {[
                { label: 'Secteurs',  value: Object.keys(zonesBySector).length },
                { label: 'Quartiers', value: zones.length },
                { label: 'Nouveaux',  value: '+2' },
                { label: 'Livraison', value: '7j/7' },
              ].map((s) => (
                <div key={s.label} className="flex items-baseline gap-2">
                  <dd className="font-display text-xl font-bold text-primary">{s.value}</dd>
                  <dt className="text-xs font-medium uppercase tracking-widest text-ink-subtle">
                    {s.label}
                  </dt>
                </div>
              ))}
            </dl>

            {/* Sector cards */}
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(zonesBySector).map(([sector, list]) => (
                <article key={sector} className="rounded-lg bg-white p-4 shadow-sm">
                  <header className="flex items-baseline justify-between gap-2 border-b border-surface-border pb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <h3 className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                        {sector}
                      </h3>
                    </div>
                    <span className="font-display text-lg font-bold text-primary">
                      {list.length}
                    </span>
                  </header>
                  <ul className="mt-2 space-y-1">
                    {list.map((z) => (
                      <li key={z.id} className="text-sm text-ink">{z.name}</li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-ink-subtle">
              Nouveaux quartiers ajoutés dans le cadre du dispositif d’urgence :{' '}
              <span className="font-semibold text-ink">Akébé</span> ·{' '}
              <span className="font-semibold text-ink">Bikélé</span>.
            </p>
          </div>
        </section>

        {/* ===================== PARTENAIRES ===================== */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-primary">
                Opérateurs partenaires
              </p>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Un dispositif mixte
              </h2>
              <p className="mt-3 text-base text-ink-muted sm:text-lg">
                La distribution est assurée <span className="font-semibold text-ink">concomitamment</span> par
                les Forces de Défense et de Sécurité et par les opérateurs privés homologués par la
                Direction Générale de l’Eau.
              </p>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {/* Bloc militaire */}
              <div>
                <div className="flex items-baseline gap-2 border-b border-surface-border pb-3">
                  <TruckIcon className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                    Forces de Défense et de Sécurité
                  </p>
                  <span className="ml-auto font-display text-lg font-bold text-primary">
                    {MILITARY_PARTNERS.length}
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {MILITARY_PARTNERS.map((p) => (
                    <li key={p.name} className="flex items-center justify-between gap-3 rounded-lg bg-white p-3 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary">
                          <ShieldIcon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium text-ink">{p.name}</span>
                      </div>
                      <a href={`tel:${p.hotline}`} className="font-mono text-sm font-bold text-primary">
                        {p.hotline}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bloc privé */}
              <div>
                <div className="flex items-baseline gap-2 border-b border-surface-border pb-3">
                  <DropletIcon className="h-5 w-5 shrink-0 text-primary" />
                  <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">
                    Opérateurs privés homologués
                  </p>
                  <span className="ml-auto text-xs font-medium text-ink-subtle">
                    Homologation DGE
                  </span>
                </div>
                <div className="mt-4 rounded-lg bg-white p-5 shadow-sm">
                  <p className="text-sm text-ink-muted">
                    Les sociétés privées intègrent progressivement le dispositif après validation
                    des procédures d’homologation par la <span className="font-semibold text-ink">Direction
                    Générale de l’Eau</span>. Elles opèrent aux <span className="font-semibold text-ink">mêmes
                    tarifs officiels</span>, avec la même plateforme d’attribution.
                  </p>
                  <p className="mt-4 text-xs uppercase tracking-widest text-ink-subtle">
                    Vous êtes opérateur d’eau ?
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    Rapprochez-vous de la Direction Générale de l’Eau pour engager la procédure
                    d’homologation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===================== NUMÉROS VERTS ===================== */}
        <section id="urgence" className="bg-primary text-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-widest text-accent">
                Cinq numéros verts
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Assistance disponible 24 heures sur 24
              </h2>
              <p className="mt-4 text-base text-white/80 sm:text-lg">
                Pour passer commande par téléphone ou signaler une urgence, appelez l’un des
                numéros verts officiels. Appel gratuit depuis un mobile.
              </p>
            </div>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { number: '18',  name: 'Sapeurs-Pompiers' },
                { number: '181', name: 'Génie Militaire' },
                { number: '182', name: 'Garde Républicaine' },
                { number: '183', name: 'Gendarmerie Nationale' },
              ].map((h) => (
                <li key={h.number}>
                  <a
                    href={`tel:${h.number}`}
                    className="flex items-center gap-4 rounded-lg bg-white/10 p-4 transition-colors hover:bg-white/20 focus-visible:outline-none"
                  >
                    <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
                      <PhoneIcon className="h-6 w-6" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white/70">{h.name}</p>
                      <p className="mt-0.5 font-mono text-2xl font-bold">{h.number}</p>
                    </div>
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg bg-white/10 p-4">
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger text-white">
                <AlertTriangleIcon className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-widest text-white/70">
                  Signalement d’abus tarifaire
                </p>
                <p className="mt-0.5 text-sm text-white">
                  Ministère de l’Accès Universel à l’Eau —{' '}
                  <a href="tel:184" className="font-mono text-lg font-bold text-white underline">
                    184
                  </a>
                </p>
              </div>
              <Link
                href="/nouvelles-mesures"
                className="inline-flex min-h-touch items-center gap-2 rounded-lg border border-white/30 bg-transparent px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-none"
              >
                Toutes les mesures
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* ===================== FOOTER ===================== */}
      <footer className="bg-slate-950 text-slate-300">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <BrandMark variant="dark" size="lg" href={null} />
              <p className="mt-4 max-w-sm text-xs text-slate-400">
                Ministère de l’Accès Universel à l’Eau et à l’Énergie
              </p>
              <p className="mt-4 max-w-sm text-sm text-slate-400">
                Plateforme officielle de commande et de livraison d’eau potable dans le Grand
                Libreville. Développée dans le cadre du dispositif d’urgence hydrique.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Plateforme</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li><a href="#comment" className="hover:text-white">Comment ça marche</a></li>
                <li><a href="#tarifs" className="hover:text-white">Tarifs officiels</a></li>
                <li><a href="#zones" className="hover:text-white">Zones desservies</a></li>
                <li><Link href="/signup" className="hover:text-white">Créer un compte</Link></li>
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">Contact</p>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <a href="tel:18" className="hover:text-white">Numéro vert : 18</a>
                </li>
                <li>Libreville, Gabon</li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-slate-800 pt-6 text-xs text-slate-500">
            © {new Date().getFullYear()} République Gabonaise — Ministère de l’Accès Universel à
            l’Eau et à l’Énergie. Tous droits réservés.
          </div>
        </div>
      </footer>
    </>
  );
}
