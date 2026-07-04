import type { SVGProps } from 'react';

const base = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
} satisfies Partial<SVGProps<SVGSVGElement>>;

export function DropletIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3s6 7.2 6 12a6 6 0 1 1-12 0c0-4.8 6-12 6-12z" />
    </svg>
  );
}

export function TruckIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="18" r="1.75" />
      <circle cx="17" cy="18" r="1.75" />
    </svg>
  );
}

export function PhoneIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 5c0 8 7 15 15 15l2-4-5-2-2 2c-2-1-4-3-5-5l2-2-2-5-4 1z" />
    </svg>
  );
}

export function CheckIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12l4 4 10-10" />
    </svg>
  );
}

export function MapPinIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 22s7-7 7-13a7 7 0 1 0-14 0c0 6 7 13 7 13z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function ClockIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ShieldIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />
    </svg>
  );
}

export function ArrowRightIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function AlertTriangleIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="18" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function ChevronDownIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function DashboardIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" />
    </svg>
  );
}

export function ClipboardIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M8 4h8v3H8z" />
      <path d="M6 6h2m8 0h2v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6z" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

export function BuildingIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 22V4a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v18" />
      <path d="M8 7h2M8 11h2M8 15h2M14 7h2M14 11h2M14 15h2M10 22v-4h4v4" />
    </svg>
  );
}

export function MapIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}

export function TagIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M12 3H4v8l9 9 8-8z" />
      <circle cx="8" cy="7" r="1" fill="currentColor" />
    </svg>
  );
}

export function UsersIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15 20c0-2.5 2-4.5 4.5-4.5s2.5 1.5 2.5 4.5" />
    </svg>
  );
}

export function ListIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.5M3 12h.5M3 18h.5" />
    </svg>
  );
}

export function MenuIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}

export function XIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M6 6l12 12M18 6l-12 12" />
    </svg>
  );
}

export function CrosshairIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  );
}

export function HouseIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
    </svg>
  );
}

export function TrendUpIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M4 17l6-6 4 4 6-6" />
      <path d="M14 5h6v6" />
    </svg>
  );
}

export function CoinIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9c-1-1.5-4-2-6-1s-2 3 0 4c2 1 6 1 6 3s-3 3-6 2c-1.5-.5-2-1-2-2" />
    </svg>
  );
}

export function BoltIcon(p: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...p}>
      <path d="M13 3 5 14h6l-1 7 8-11h-6z" />
    </svg>
  );
}
