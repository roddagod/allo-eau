import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { ArrowRightIcon, AlertTriangleIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

async function fetchKpis() {
  const supabase = await createServerClient();
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const iso = todayStart.toISOString();

  const [
    ordersToday,
    awaitingDispatch,
    inDelivery,
    delivered,
    incidents,
    companies,
    zonesUncovered,
    revenue,
  ] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', iso),
    supabase.from('orders').select('id', { count: 'exact', head: true }).is('company_id', null).eq('order_status', 'pending'),
    supabase.from('orders').select('id', { count: 'exact', head: true }).in('order_status', ['accepted','slot_confirmed','driver_assigned','driver_en_route','arrived_nearby']),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('order_status', 'delivered').gte('created_at', iso),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('order_status', 'incident'),
    supabase.from('companies').select('id', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('uncovered_zones').select('id', { count: 'exact', head: true }),
    supabase.from('orders').select('total_amount_fcfa').eq('order_status', 'delivered').gte('created_at', iso),
  ]);

  const revenueSum =
    (revenue.data as { total_amount_fcfa: number }[] | null)?.reduce(
      (sum, r) => sum + (r.total_amount_fcfa ?? 0),
      0,
    ) ?? 0;

  return {
    ordersToday:      ordersToday.count ?? 0,
    awaitingDispatch: awaitingDispatch.count ?? 0,
    inDelivery:       inDelivery.count ?? 0,
    delivered:        delivered.count ?? 0,
    incidents:        incidents.count ?? 0,
    activeCompanies:  companies.count ?? 0,
    uncoveredZones:   zonesUncovered.count ?? 0,
    revenueFcfa:      revenueSum,
  };
}

function Kpi({
  label,
  value,
  href,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  href?: string;
  tone?: 'neutral' | 'warn' | 'good' | 'bad';
}) {
  const toneCls = {
    neutral: 'bg-white',
    warn:    'bg-amber-50',
    good:    'bg-accent-50',
    bad:     'bg-danger-soft',
  }[tone];
  const inner = (
    <div className={`rounded-lg p-5 ${toneCls}`}>
      <p className="text-xs uppercase tracking-widest text-ink-subtle">{label}</p>
      <p className="mt-2 text-3xl font-bold text-ink">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminDashboardPage() {
  const kpi = await fetchKpis();

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary">Vue globale</p>
        <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">Tableau de bord</h1>
        <p className="mt-1 text-sm text-ink-muted">Vision globale des opérations du jour.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Commandes du jour"       value={kpi.ordersToday}                       href="/commandes" />
        <Kpi label="À attribuer"             value={kpi.awaitingDispatch} tone="warn"      href="/commandes?filter=awaiting" />
        <Kpi label="En livraison"            value={kpi.inDelivery}                        href="/commandes?filter=in_delivery" />
        <Kpi label="Livrées aujourd’hui"     value={kpi.delivered}        tone="good"      href="/commandes?filter=delivered" />
        <Kpi label="Incidents ouverts"       value={kpi.incidents}        tone={kpi.incidents > 0 ? 'bad' : 'neutral'} href="/commandes?filter=incident" />
        <Kpi label="Sociétés actives"        value={kpi.activeCompanies}                   href="/societes" />
        <Kpi label="Quartiers non couverts"  value={kpi.uncoveredZones}   tone={kpi.uncoveredZones > 0 ? 'warn' : 'neutral'} />
        <Kpi label="Chiffre d’affaires jour" value={formatFcfa(kpi.revenueFcfa)}          tone="good" />
      </section>

      {kpi.awaitingDispatch > 0 && (
        <section className="mt-8 flex flex-col gap-4 rounded-lg bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
              <AlertTriangleIcon className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-900">
                {kpi.awaitingDispatch} commande{kpi.awaitingDispatch > 1 ? 's' : ''} en attente d’attribution manuelle
              </p>
              <p className="mt-1 text-sm text-amber-800">
                Aucune société active ne couvre le quartier concerné, ou toutes les sociétés éligibles ont refusé.
              </p>
            </div>
          </div>
          <Link
            href="/commandes?filter=awaiting"
            className="inline-flex min-h-touch shrink-0 items-center gap-2 rounded-lg bg-amber-900 px-4 text-sm font-semibold text-white hover:bg-amber-950"
          >
            Ouvrir la file
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </section>
      )}
    </div>
  );
}
