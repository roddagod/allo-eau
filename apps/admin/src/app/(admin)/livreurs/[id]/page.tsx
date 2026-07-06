import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createServerClient } from '@eaupourtous/db/server';
import { formatFcfa } from '@eaupourtous/domain/pricing';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';
import { MapPinIcon, PhoneIcon, ClockIcon, BuildingIcon } from '@/components/icons';
import { DriverEditForm } from './driver-edit-form';
import { SuspendToggle } from './suspend-toggle';

export const dynamic = 'force-dynamic';

type DriverStatus = 'available' | 'on_delivery' | 'off_duty' | 'suspended';

type DriverDetail = {
  id: string;
  reference: string | null;
  status: DriverStatus;
  company_id: string;
  primary_zone_id: string | null;
  current_location: string | null;
  location_updated_at: string | null;
  max_concurrent_orders: number;
  created_at: string;
  companies: { commercial_name: string } | null;
  primary_zone: { name: string; sector: string | null } | null;
  profile: { first_name: string | null; last_name: string | null; phone: string | null; email: string | null } | null;
};

type OrderRow = {
  id: string;
  reference: string;
  order_status: OrderStatus;
  volume_liters: number;
  quantity: number;
  total_amount_fcfa: number;
  address: string;
  actual_delivered_at: string | null;
  created_at: string;
  zones: { name: string } | null;
};

const STATUS_LABEL: Record<DriverStatus, string> = {
  available:   'Disponible',
  on_delivery: 'En livraison',
  off_duty:    'Hors service',
  suspended:   'Suspendu',
};

const STATUS_PILL: Record<DriverStatus, string> = {
  available:   'bg-accent-50 text-accent-700',
  on_delivery: 'bg-amber-100 text-amber-800',
  off_duty:    'bg-surface-muted text-ink-subtle',
  suspended:   'bg-danger-soft text-danger',
};

const ACTIVE_STATUSES: OrderStatus[] = ['driver_assigned', 'driver_en_route', 'arrived_nearby'];

function parseWkt(wkt: string | null): [number, number] | null {
  if (!wkt) return null;
  const m = wkt.match(/POINT\s*\(\s*(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s*\)/i);
  if (!m) return null;
  return [Number(m[1]), Number(m[2])];
}

function minutesAgo(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
}

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerClient();

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);

  const [driverRes, activeRes, historyRes, todayCountRes, weekCountRes, monthCountRes, companiesRes, zonesRes] = await Promise.all([
    supabase
      .from('drivers')
      .select(`
        id, reference, status, company_id, primary_zone_id,
        current_location, location_updated_at, max_concurrent_orders, created_at,
        companies (commercial_name),
        primary_zone:zones!drivers_primary_zone_id_fkey (name, sector),
        profile:profiles!drivers_id_fkey (first_name, last_name, phone, email)
      `)
      .eq('id', id)
      .single<DriverDetail>(),
    supabase
      .from('orders')
      .select(`
        id, reference, order_status, volume_liters, quantity,
        total_amount_fcfa, address, actual_delivered_at, created_at,
        zones (name)
      `)
      .eq('driver_id', id)
      .in('order_status', ACTIVE_STATUSES)
      .order('created_at', { ascending: false })
      .returns<OrderRow[]>(),
    supabase
      .from('orders')
      .select(`
        id, reference, order_status, volume_liters, quantity,
        total_amount_fcfa, address, actual_delivered_at, created_at,
        zones (name)
      `)
      .eq('driver_id', id)
      .eq('order_status', 'delivered')
      .gte('actual_delivered_at', sevenDaysAgo)
      .order('actual_delivered_at', { ascending: false })
      .limit(50)
      .returns<OrderRow[]>(),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', id)
      .eq('order_status', 'delivered')
      .gte('actual_delivered_at', todayStart.toISOString()),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', id)
      .eq('order_status', 'delivered')
      .gte('actual_delivered_at', sevenDaysAgo),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('driver_id', id)
      .eq('order_status', 'delivered')
      .gte('actual_delivered_at', thirtyDaysAgo),
    supabase.from('companies').select('id, commercial_name').eq('status', 'active').order('commercial_name'),
    supabase.from('zones').select('id, name, sector').eq('status', 'active').order('name'),
  ]);

  const driver = driverRes.data;
  if (!driver) notFound();

  const name = [driver.profile?.first_name, driver.profile?.last_name].filter(Boolean).join(' ') || 'Livreur';
  const active = activeRes.data ?? [];
  const history = historyRes.data ?? [];
  const todayCount = todayCountRes.count ?? 0;
  const weekCount = weekCountRes.count ?? 0;
  const monthCount = monthCountRes.count ?? 0;

  const totalLitersActive = active.reduce((s, o) => s + o.quantity * o.volume_liters, 0);
  const totalLitersWeek = history.reduce((s, o) => s + o.quantity * o.volume_liters, 0);

  const coord = parseWkt(driver.current_location);
  const posMinAgo = minutesAgo(driver.location_updated_at);
  const posLive = posMinAgo !== null && posMinAgo <= 3;

  return (
    <div>
      <Link href="/livreurs" className="text-sm font-medium text-ink-muted hover:text-primary">
        ← Tous les livreurs
      </Link>

      <header className="mt-3 mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
            {driver.reference ?? 'AE-???'}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">{name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <BuildingIcon className="h-4 w-4" />
            {driver.companies?.commercial_name ?? '—'}
            {driver.primary_zone && (
              <>
                <span className="text-ink-subtle">·</span>
                <MapPinIcon className="h-4 w-4" />
                {driver.primary_zone.name}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${STATUS_PILL[driver.status]}`}>
            {STATUS_LABEL[driver.status]}
          </span>
          <SuspendToggle driverId={driver.id} status={driver.status} />
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-6 lg:col-span-2">
          {/* KPIs */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-ink-subtle">Aujourd’hui</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{todayCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-ink-subtle">7 jours</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{weekCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-ink-subtle">30 jours</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{monthCount}</p>
            </div>
            <div className="rounded-lg bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-widest text-ink-subtle">En cours</p>
              <p className="mt-1 font-display text-2xl font-bold text-accent">{active.length}</p>
            </div>
          </section>

          {/* Tournée du jour */}
          <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-subtle">
                Tournée en cours
              </h2>
              <span className="text-xs text-ink-muted">
                {active.length > 0
                  ? `${totalLitersActive >= 1000 ? (totalLitersActive / 1000).toFixed(1) + ' m³' : totalLitersActive + ' L'} à livrer`
                  : ''}
              </span>
            </div>
            {active.length === 0 ? (
              <p className="mt-4 rounded-lg bg-surface-muted p-6 text-center text-sm text-ink-subtle">
                Aucune commande en cours.
              </p>
            ) : (
              <ol className="mt-4 space-y-2">
                {active.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/commandes/${o.id}`}
                      className="flex items-center gap-3 rounded-lg border border-surface-border p-3 transition-colors hover:bg-surface-muted"
                    >
                      <span className="inline-block rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-semibold text-accent-700">
                        {ORDER_STATUS_LABELS[o.order_status]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                          {o.reference}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-medium text-ink">
                          {o.quantity} × {o.volume_liters} L · {o.zones?.name ?? '—'}
                        </p>
                      </div>
                      <p className="whitespace-nowrap text-sm font-bold text-primary">
                        {formatFcfa(o.total_amount_fcfa)}
                      </p>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* Historique 7j */}
          <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-subtle">
                Livraisons — 7 derniers jours
              </h2>
              <span className="text-xs text-ink-muted">
                {history.length > 0
                  ? `${totalLitersWeek >= 1000 ? (totalLitersWeek / 1000).toFixed(1) + ' m³' : totalLitersWeek + ' L'} distribués`
                  : ''}
              </span>
            </div>
            {history.length === 0 ? (
              <p className="mt-4 rounded-lg bg-surface-muted p-6 text-center text-sm text-ink-subtle">
                Aucune livraison sur cette période.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-surface-border">
                {history.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-ink-subtle">
                        {o.reference}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-ink">
                        {o.quantity} × {o.volume_liters} L · {o.zones?.name ?? '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-ink-muted">
                        {o.actual_delivered_at
                          ? new Date(o.actual_delivered_at).toLocaleDateString('fr-FR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                            })
                          : '—'}
                      </p>
                      <p className="text-sm font-medium text-ink">{formatFcfa(o.total_amount_fcfa)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Édition profil */}
          <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-ink-subtle">
                Profil
              </h2>
              <DriverEditForm
                driverId={driver.id}
                initial={{
                  firstName: driver.profile?.first_name ?? '',
                  lastName: driver.profile?.last_name ?? '',
                  phone: driver.profile?.phone ?? '',
                  companyId: driver.company_id,
                  primaryZoneId: driver.primary_zone_id,
                }}
                companies={companiesRes.data ?? []}
                zones={zonesRes.data ?? []}
              />
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {driver.profile?.phone && (
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-primary" />
                  <a href={`tel:${driver.profile.phone}`} className="text-sm font-medium text-primary underline">
                    {driver.profile.phone}
                  </a>
                </div>
              )}
              {driver.profile?.email && (
                <div className="min-w-0">
                  <dt className="text-xs uppercase tracking-widest text-ink-subtle">Email</dt>
                  <dd className="truncate text-sm text-ink">{driver.profile.email}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-widest text-ink-subtle">Capacité simultanée</dt>
                <dd className="text-sm text-ink">{driver.max_concurrent_orders} commandes</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-ink-subtle">Inscrit le</dt>
                <dd className="text-sm text-ink">
                  {new Date(driver.created_at).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  })}
                </dd>
              </div>
            </dl>
          </section>
        </div>

        {/* Colonne latérale : position */}
        <aside className="space-y-4">
          <section className="rounded-lg bg-primary-50 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-4 w-4 text-primary" />
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">
                Position en direct
              </p>
              {posLive && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-widest text-accent-700">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                  Live
                </span>
              )}
            </div>
            {coord ? (
              <>
                <p className="mt-4 flex items-center gap-2 text-sm text-ink">
                  <ClockIcon className="h-4 w-4 text-ink-subtle" />
                  {posMinAgo === 0
                    ? 'Mise à jour à l’instant'
                    : posMinAgo === 1
                      ? 'Mise à jour il y a 1 min'
                      : `Mise à jour il y a ${posMinAgo} min`}
                </p>
                <p className="mt-3 font-mono text-[11px] text-ink-muted">
                  {coord[1].toFixed(5)}, {coord[0].toFixed(5)}
                </p>
                <a
                  href={`https://www.google.com/maps?q=${coord[1]},${coord[0]}`}
                  target="_blank"
                  rel="noopener"
                  className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Ouvrir dans Google Maps
                </a>
                <Link
                  href="/carte"
                  className="mt-2 inline-flex w-full items-center justify-center rounded-lg border border-primary-100 px-3 py-2 text-sm font-medium text-primary hover:bg-primary-100"
                >
                  Voir sur la carte des opérations
                </Link>
              </>
            ) : (
              <p className="mt-4 rounded-lg bg-white p-4 text-center text-sm text-ink-subtle">
                Aucune position transmise. Le livreur doit ouvrir son application avec géolocalisation.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
