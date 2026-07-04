import Link from 'next/link';
import type { SVGProps } from 'react';
import { AlertTriangleIcon, ClipboardIcon, BuildingIcon, MapIcon } from '@/components/icons';

export type AlertTile = {
  label: string;
  value: number;
  href: string;
  tone: 'warning' | 'danger' | 'primary';
  Icon: React.ComponentType<SVGProps<SVGSVGElement>>;
};

const toneClasses: Record<AlertTile['tone'], { bg: string; icon: string; text: string }> = {
  warning: { bg: 'bg-amber-50',   icon: 'bg-amber-100 text-amber-800', text: 'text-amber-900' },
  danger:  { bg: 'bg-danger-soft',icon: 'bg-danger text-white',        text: 'text-danger' },
  primary: { bg: 'bg-primary-50', icon: 'bg-primary text-white',       text: 'text-primary' },
};

export function AlertsPanel({
  awaitingDispatch,
  incidents,
  pendingCompanies,
  uncoveredZones,
}: {
  awaitingDispatch: number;
  incidents: number;
  pendingCompanies: number;
  uncoveredZones: number;
}) {
  const tiles: AlertTile[] = [
    {
      label: 'À attribuer manuellement',
      value: awaitingDispatch,
      href:  '/commandes?filter=awaiting',
      tone:  awaitingDispatch > 0 ? 'warning' : 'primary',
      Icon:  ClipboardIcon,
    },
    {
      label: 'Incidents ouverts',
      value: incidents,
      href:  '/commandes?filter=incident',
      tone:  incidents > 0 ? 'danger' : 'primary',
      Icon:  AlertTriangleIcon,
    },
    {
      label: 'Sociétés à valider',
      value: pendingCompanies,
      href:  '/societes',
      tone:  pendingCompanies > 0 ? 'warning' : 'primary',
      Icon:  BuildingIcon,
    },
    {
      label: 'Quartiers non couverts',
      value: uncoveredZones,
      href:  '/zones',
      tone:  uncoveredZones > 0 ? 'warning' : 'primary',
      Icon:  MapIcon,
    },
  ];

  return (
    <section>
      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-subtle">
        Points d’attention
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => {
          const c = toneClasses[t.tone];
          return (
            <Link
              key={t.label}
              href={t.href}
              className={`flex items-center justify-between gap-3 rounded-lg ${c.bg} p-4 hover:opacity-90`}
            >
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-widest text-ink-subtle">
                  {t.label}
                </p>
                <p className={`mt-1 font-display text-2xl font-bold ${c.text}`}>{t.value}</p>
              </div>
              <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.icon}`}>
                <t.Icon className="h-5 w-5" />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
