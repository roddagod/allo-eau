import Link from 'next/link';
import { ORDER_STATUS_LABELS, type OrderStatus } from '@eaupourtous/domain/order-status';

export type FeedItem = {
  id: string;
  reference: string;
  status: OrderStatus;
  quantity: number;
  volumeLiters: number;
  companyName: string | null;
  clientName: string | null;
  zoneName: string | null;
  createdAt: string;
};

const statusColor: Record<OrderStatus, string> = {
  pending:         '#1F3480',
  accepted:        '#3A5199',
  refused:         '#B91C1C',
  slot_confirmed:  '#3A5199',
  driver_assigned: '#B45309',
  driver_en_route: '#B45309',
  arrived_nearby:  '#B45309',
  delivered:       '#047857',
  cancelled:       '#64748B',
  incident:        '#B91C1C',
};

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const s = Math.max(1, Math.round((Date.now() - d.getTime()) / 1000));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} j`;
}

export function LiveFeed({ items }: { items: FeedItem[] }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
          Flux des commandes
        </p>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-700">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          En direct
        </span>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-ink-subtle">Aucune activité récente.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {items.map((it) => (
            <li key={it.id}>
              <Link
                href={`/commandes/${it.id}`}
                className="flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-surface-muted"
              >
                <span
                  className="mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: statusColor[it.status] }}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
                    <span className="font-mono text-xs uppercase tracking-widest text-ink-subtle">
                      {it.reference}
                    </span>
                    <span className="text-xs text-ink-subtle">·</span>
                    <span className="text-xs text-ink-subtle">{relativeTime(it.createdAt)}</span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-ink">
                    <span className="font-semibold">{it.quantity} × {it.volumeLiters} L</span>
                    {it.clientName && <> · {it.clientName}</>}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-subtle">
                    {ORDER_STATUS_LABELS[it.status]}
                    {it.companyName && <> · {it.companyName}</>}
                    {it.zoneName && <> · {it.zoneName}</>}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
