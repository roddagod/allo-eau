import type { SVGProps } from 'react';
import { TrendUpIcon } from '@/components/icons';

type Tone = 'primary' | 'accent' | 'warning' | 'danger';

const toneClasses: Record<Tone, { bg: string; text: string; ring: string }> = {
  primary: { bg: 'bg-primary',    text: 'text-white',       ring: 'bg-primary-100 text-primary' },
  accent:  { bg: 'bg-accent',     text: 'text-white',       ring: 'bg-accent-100 text-accent-700' },
  warning: { bg: 'bg-amber-500',  text: 'text-white',       ring: 'bg-amber-100 text-amber-800' },
  danger:  { bg: 'bg-danger',     text: 'text-white',       ring: 'bg-danger-soft text-danger' },
};

export function HeroKpi({
  label,
  value,
  unit,
  delta,
  hint,
  Icon,
  tone = 'primary',
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  hint?: string;
  Icon: React.ComponentType<SVGProps<SVGSVGElement>>;
  tone?: Tone;
}) {
  const t = toneClasses[tone];
  return (
    <article className={`relative overflow-hidden rounded-lg ${t.bg} p-5 sm:p-6 ${t.text} shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80">{label}</p>
          <p className="mt-2 font-display text-4xl font-bold leading-none sm:text-5xl">
            {value}
            {unit && <span className="ml-1 text-lg font-medium opacity-80">{unit}</span>}
          </p>
          {hint && <p className="mt-2 text-xs opacity-75">{hint}</p>}
        </div>
        <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${t.ring}`}>
          <Icon className="h-6 w-6" />
        </span>
      </div>
      {delta && (
        <p className="mt-4 flex items-center gap-1.5 text-xs font-semibold opacity-90">
          <TrendUpIcon className="h-4 w-4" />
          {delta}
        </p>
      )}
    </article>
  );
}
