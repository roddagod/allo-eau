import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import type { OrderStatus } from '@eaupourtous/domain/order-status';
import { HeroKpi } from './_dashboard/hero-kpi';
import { OrdersChart, type DailyPoint } from './_dashboard/orders-chart';
import { OperatorDonut, type OperatorSlice } from './_dashboard/operator-donut';
import { LiveFeed, type FeedItem } from './_dashboard/live-feed';
import { AlertsPanel } from './_dashboard/alerts';
import { SectorCoveragePanel, type SectorCoverage } from './_dashboard/sector-coverage';
import { HouseIcon, DropletIcon, CoinIcon, BoltIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';
export const revalidate = 30; // rafraîchit auto toutes les 30 s

// Date de déclaration de l'état d'urgence hydrique
const EMERGENCY_START = '2026-07-01T00:00:00Z';

// -----------------------------------------------------------------------------
// Data fetching
// -----------------------------------------------------------------------------

async function fetchDashboard() {
  const supabase = await createServerClient();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayIso = todayStart.toISOString();

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);
  const sevenDaysIso = sevenDaysAgo.toISOString();

  const [
    // Impact global (depuis l'urgence)
    { data: deliveredCumRows },
    { count: householdsCount },
    // Jour
    { count: ordersToday },
    { count: deliveredToday },
    { count: awaitingDispatch },
    { count: incidents },
    { count: pendingCompanies },
    // Structure
    { count: activeCompanies },
    { data: companyTypes },
    { data: zonesRows },
    { data: coverageRows },
    // 7 jours
    { data: last7 },
    // Live feed
    { data: liveFeed },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('quantity, volume_liters, total_amount_fcfa')
      .eq('order_status', 'delivered')
      .gte('created_at', EMERGENCY_START),
    supabase
      .from('orders')
      .select('client_snapshot', { count: 'exact', head: false })
      .eq('order_status', 'delivered')
      .gte('created_at', EMERGENCY_START),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayIso),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('order_status', 'delivered')
      .gte('created_at', todayIso),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .is('company_id', null)
      .eq('order_status', 'pending'),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('order_status', 'incident'),
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending_validation'),
    supabase
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase
      .from('companies')
      .select('operator_type, status'),
    supabase.from('zones').select('id, sector, status').eq('status', 'active'),
    supabase.from('company_zones').select('zone_id, companies!inner(status)'),
    supabase
      .from('orders')
      .select('created_at')
      .gte('created_at', sevenDaysIso),
    supabase
      .from('orders')
      .select('id, reference, order_status, quantity, volume_liters, created_at, client_snapshot, companies(commercial_name), zones(name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  // --- Agrégations impact
  const delivered = (deliveredCumRows as { quantity: number; volume_liters: number; total_amount_fcfa: number }[]) ?? [];
  const totalCuves = delivered.reduce((s, r) => s + (r.quantity ?? 0), 0);
  const totalLiters = delivered.reduce((s, r) => s + (r.quantity ?? 0) * (r.volume_liters ?? 0), 0);
  const totalRevenue = delivered.reduce((s, r) => s + (r.total_amount_fcfa ?? 0), 0);
  // Économie citoyenne = (ancien tarif 10 000 - nouveau tarif) × nb cuves 1000L
  const cuves1000L = delivered.filter((r) => r.volume_liters === 1000).reduce((s, r) => s + (r.quantity ?? 0), 0);
  const savingsFcfa = cuves1000L * (10_000 - 4_000);

  const householdsServed = householdsCount ?? 0; // approximation

  // --- 7 jours
  const dailyPoints: DailyPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    d.setUTCHours(0, 0, 0, 0);
    const iso = d.toISOString().slice(0, 10);
    dailyPoints.push({ date: iso, count: 0 });
  }
  for (const row of (last7 as { created_at: string }[]) ?? []) {
    const day = row.created_at.slice(0, 10);
    const point = dailyPoints.find((p) => p.date === day);
    if (point) point.count += 1;
  }

  // --- Donut opérateurs
  const OPERATOR_COLORS = { military: '#1F3480', private: '#009E60', municipal: '#B45309' } as const;
  const OPERATOR_LABELS = { military: 'Militaire', private: 'Privé homologué', municipal: 'Public' } as const;
  const grouped: Record<'military' | 'private' | 'municipal', number> = { military: 0, private: 0, municipal: 0 };
  for (const c of (companyTypes as { operator_type: 'military' | 'private' | 'municipal'; status: string }[]) ?? []) {
    if (c.status === 'active') grouped[c.operator_type] += 1;
  }
  const donutSlices: OperatorSlice[] = (['military', 'private', 'municipal'] as const)
    .filter((k) => grouped[k] > 0)
    .map((k) => ({
      key: k,
      label: OPERATOR_LABELS[k],
      count: grouped[k],
      color: OPERATOR_COLORS[k],
    }));

  // --- Couverture sectorielle
  const zonesList = (zonesRows as { id: string; sector: string | null; status: string }[]) ?? [];
  const coverageList = (coverageRows as { zone_id: string; companies: { status: string } }[]) ?? [];
  const coveredZoneIds = new Set(
    coverageList.filter((c) => c.companies?.status === 'active').map((c) => c.zone_id),
  );
  const bySector: Record<string, { total: number; covered: number }> = {};
  for (const z of zonesList) {
    const s = z.sector ?? 'Autre';
    bySector[s] ??= { total: 0, covered: 0 };
    bySector[s].total += 1;
    if (coveredZoneIds.has(z.id)) bySector[s].covered += 1;
  }
  const sectorCoverage: SectorCoverage[] = Object.entries(bySector)
    .map(([sector, v]) => ({ sector, ...v }))
    .sort((a, b) => (a.sector > b.sector ? 1 : -1));
  const uncoveredZones = zonesList.length - coveredZoneIds.size;

  // --- Live feed
  const feed: FeedItem[] = (
    (liveFeed as {
      id: string;
      reference: string;
      order_status: OrderStatus;
      quantity: number;
      volume_liters: number;
      created_at: string;
      client_snapshot: { first_name?: string; last_name?: string } | null;
      companies: { commercial_name: string } | null;
      zones: { name: string } | null;
    }[]) ?? []
  ).map((r) => ({
    id: r.id,
    reference: r.reference,
    status: r.order_status,
    quantity: r.quantity,
    volumeLiters: r.volume_liters,
    createdAt: r.created_at,
    clientName:
      [r.client_snapshot?.first_name, r.client_snapshot?.last_name].filter(Boolean).join(' ') ||
      null,
    companyName: r.companies?.commercial_name ?? null,
    zoneName: r.zones?.name ?? null,
  }));

  return {
    householdsServed,
    totalCuves,
    totalLiters,
    totalRevenue,
    savingsFcfa,
    ordersToday: ordersToday ?? 0,
    deliveredToday: deliveredToday ?? 0,
    awaitingDispatch: awaitingDispatch ?? 0,
    incidents: incidents ?? 0,
    pendingCompanies: pendingCompanies ?? 0,
    activeCompanies: activeCompanies ?? 0,
    dailyPoints,
    donutSlices,
    sectorCoverage,
    uncoveredZones,
    feed,
  };
}

// -----------------------------------------------------------------------------
// Helpers d'affichage
// -----------------------------------------------------------------------------

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fr-FR').format(n);
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)} k`;
  return formatNumber(n);
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

export default async function AdminDashboardPage() {
  const d = await fetchDashboard();
  const nowLabel = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-8">
      {/* Header */}
      <header>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Ministère de l’Accès Universel à l’Eau et à l’Énergie
            </p>
            <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
              Tableau de bord — Dispositif d’urgence hydrique
            </h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-ink-muted shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            En direct · maj {nowLabel}
          </span>
        </div>
      </header>

      {/* Hero KPIs — l'histoire à raconter au Ministre */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <HeroKpi
          label="Foyers desservis"
          value={formatNumber(d.householdsServed)}
          hint="Depuis le décret d’urgence"
          Icon={HouseIcon}
          tone="primary"
        />
        <HeroKpi
          label="Volume distribué"
          value={formatCompact(d.totalLiters)}
          unit="L"
          hint={`${formatNumber(d.totalCuves)} cuves livrées`}
          Icon={DropletIcon}
          tone="accent"
        />
        <HeroKpi
          label="Économie citoyenne"
          value={formatCompact(d.savingsFcfa)}
          unit="FCFA"
          hint="Grâce au tarif réglementé de 4 000 FCFA le m³"
          Icon={CoinIcon}
          tone="primary"
        />
        <HeroKpi
          label="Commandes du jour"
          value={formatNumber(d.ordersToday)}
          hint={`${d.deliveredToday} livrées · CA ${formatCompact(d.totalRevenue)} FCFA`}
          Icon={BoltIcon}
          tone="accent"
        />
      </section>

      {/* Alertes / attention */}
      <AlertsPanel
        awaitingDispatch={d.awaitingDispatch}
        incidents={d.incidents}
        pendingCompanies={d.pendingCompanies}
        uncoveredZones={d.uncoveredZones}
      />

      {/* Row : chart + donut */}
      <section className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OrdersChart points={d.dailyPoints} />
        </div>
        <OperatorDonut slices={d.donutSlices} />
      </section>

      {/* Row : couverture + live feed */}
      <section className="grid gap-4 lg:grid-cols-3">
        <SectorCoveragePanel sectors={d.sectorCoverage} />
        <div className="lg:col-span-2">
          <LiveFeed items={d.feed} />
        </div>
      </section>

      {/* Bandeau contexte */}
      <section className="rounded-lg bg-primary p-5 text-white shadow-md sm:p-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Cadre légal
            </p>
            <p className="mt-2 text-sm">
              État d’urgence hydrique déclaré le <span className="font-semibold">01/07/2026</span>.
              Article 159 de la loi 011/23 · Communiqué N°2 du <span className="font-semibold">02/07/2026</span>.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Sociétés actives
            </p>
            <p className="mt-2 text-sm">
              <span className="font-display text-2xl font-bold">{d.activeCompanies}</span>
              <span className="ml-2 opacity-80">
                opérateurs actifs sur la plateforme (militaires + privés homologués DGE)
              </span>
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70">
              Tarif officiel
            </p>
            <p className="mt-2 text-sm">
              <span className="font-display text-2xl font-bold">{formatFcfa(4000)}</span>
              <span className="ml-2 opacity-80">le m³ · livraison incluse · révisé le 02/07/2026</span>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
