/**
 * Chart SVG "commandes / jour" sur 7 derniers jours.
 * Aire remplie + polyligne + points, léger axe X (jours). Sans dépendance externe.
 */
export type DailyPoint = { date: string; count: number };

const WIDTH = 720;
const HEIGHT = 220;
const PADDING = { top: 16, right: 12, bottom: 26, left: 12 };
const INNER_W = WIDTH - PADDING.left - PADDING.right;
const INNER_H = HEIGHT - PADDING.top - PADDING.bottom;

const DAYS_FR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

export function OrdersChart({ points }: { points: DailyPoint[] }) {
  const maxY = Math.max(1, ...points.map((p) => p.count));
  const stepX = points.length > 1 ? INNER_W / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = PADDING.left + i * stepX;
    const y = PADDING.top + INNER_H * (1 - p.count / maxY);
    return { x, y };
  });

  const pathLine = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const pathArea =
    coords.length > 0
      ? `${pathLine} L ${coords[coords.length - 1]!.x.toFixed(1)} ${PADDING.top + INNER_H} L ${coords[0]!.x.toFixed(1)} ${PADDING.top + INNER_H} Z`
      : '';

  const total = points.reduce((s, p) => s + p.count, 0);

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
            Commandes sur 7 jours
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-ink">{total}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-subtle">Pic journalier</p>
          <p className="mt-0.5 font-display text-lg font-bold text-primary">{maxY}</p>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="w-full min-w-[520px]"
          role="img"
          aria-label="Commandes par jour sur les 7 derniers jours"
        >
          <defs>
            <linearGradient id="ordersFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1F3480" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#1F3480" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grille horizontale (3 lignes) */}
          {[0.25, 0.5, 0.75].map((r) => (
            <line
              key={r}
              x1={PADDING.left}
              x2={PADDING.left + INNER_W}
              y1={PADDING.top + INNER_H * r}
              y2={PADDING.top + INNER_H * r}
              stroke="#E2E8F0"
              strokeDasharray="3 5"
            />
          ))}

          {/* Aire */}
          {pathArea && <path d={pathArea} fill="url(#ordersFill)" />}
          {/* Ligne */}
          {pathLine && <path d={pathLine} fill="none" stroke="#1F3480" strokeWidth="2.5" />}

          {/* Points + labels jour */}
          {coords.map((c, i) => {
            const label = points[i]!;
            const day = new Date(label.date);
            const dayLabel = DAYS_FR[day.getDay()];
            return (
              <g key={i}>
                <circle cx={c.x} cy={c.y} r="4" fill="#1F3480" />
                <circle cx={c.x} cy={c.y} r="2" fill="white" />
                <text
                  x={c.x}
                  y={PADDING.top + INNER_H + 18}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#64748B"
                >
                  {dayLabel}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
