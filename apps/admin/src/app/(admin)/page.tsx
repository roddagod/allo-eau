import Link from 'next/link';
import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';

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
    supabase
      .from('orders')
      .select('total_amount_fcfa')
      .eq('order_status', 'delivered')
      .gte('created_at', iso),
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
    neutral: 'border-slate-200 bg-white',
    warn:    'border-amber-200 bg-amber-50',
    good:    'border-emerald-200 bg-emerald-50',
    bad:     'border-red-200 bg-red-50',
  }[tone];
  const inner = (
    <div className={`rounded-2xl border p-5 ${toneCls}`}>
      <p className="text-xs uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminDashboardPage() {
  const kpi = await fetchKpis();

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Tableau de bord</h1>
        <p className="mt-1 text-sm text-slate-600">Vision globale des opérations du jour.</p>
      </header>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Kpi label="Commandes du jour"      value={kpi.ordersToday}                       href="/commandes" />
        <Kpi label="À attribuer"            value={kpi.awaitingDispatch} tone="warn"      href="/commandes?filter=awaiting" />
        <Kpi label="En livraison"           value={kpi.inDelivery}                        href="/commandes?filter=in_delivery" />
        <Kpi label="Livrées aujourd’hui"    value={kpi.delivered}        tone="good"      href="/commandes?filter=delivered" />
        <Kpi label="Incidents ouverts"      value={kpi.incidents}        tone={kpi.incidents > 0 ? 'bad' : 'neutral'} href="/commandes?filter=incident" />
        <Kpi label="Sociétés actives"       value={kpi.activeCompanies}                   href="/societes" />
        <Kpi label="Quartiers non couverts" value={kpi.uncoveredZones}   tone={kpi.uncoveredZones > 0 ? 'warn' : 'neutral'} href="/zones" />
        <Kpi label="Chiffre d’affaires jour" value={formatFcfa(kpi.revenueFcfa)}          tone="good" />
      </section>

      {kpi.awaitingDispatch > 0 && (
        <section className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900">
            {kpi.awaitingDispatch} commande{kpi.awaitingDispatch > 1 ? 's' : ''} en attente d’attribution manuelle
          </h2>
          <p className="mt-1 text-sm text-amber-800">
            Aucune société active ne couvre le quartier concerné, ou toutes les sociétés éligibles ont refusé.
            Attribuez-les manuellement via la file dédiée.
          </p>
          <Link
            href="/commandes?filter=awaiting"
            className="mt-3 inline-block rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Ouvrir la file d’attribution →
          </Link>
        </section>
      )}
    </div>
  );
}
