/**
 * Donut SVG "répartition par opérateur" — militaire / privé / public.
 * Chaque segment est calculé en arc-sweep. Aucune dépendance externe.
 */
export type OperatorSlice = {
  key: 'military' | 'private' | 'municipal';
  label: string;
  count: number;
  color: string;
};

const CX = 90;
const CY = 90;
const R_OUT = 70;
const R_IN = 44;

function arcPath(startAngle: number, endAngle: number): string {
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  const [sx1, sy1] = polar(R_OUT, startAngle);
  const [ex1, ey1] = polar(R_OUT, endAngle);
  const [sx2, sy2] = polar(R_IN, endAngle);
  const [ex2, ey2] = polar(R_IN, startAngle);
  return [
    `M ${sx1} ${sy1}`,
    `A ${R_OUT} ${R_OUT} 0 ${large} 1 ${ex1} ${ey1}`,
    `L ${sx2} ${sy2}`,
    `A ${R_IN} ${R_IN} 0 ${large} 0 ${ex2} ${ey2}`,
    'Z',
  ].join(' ');
}

function polar(r: number, a: number): [number, number] {
  return [CX + r * Math.cos(a - Math.PI / 2), CY + r * Math.sin(a - Math.PI / 2)];
}

export function OperatorDonut({ slices }: { slices: OperatorSlice[] }) {
  const total = slices.reduce((s, sl) => s + sl.count, 0);

  let acc = 0;
  const segments = slices.map((s) => {
    const pct = total === 0 ? 0 : s.count / total;
    const start = acc * 2 * Math.PI;
    const end = (acc + pct) * 2 * Math.PI;
    acc += pct;
    return { ...s, pct, path: pct > 0 ? arcPath(start, end) : '' };
  });

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
        Répartition par type d’opérateur
      </p>

      <div className="mt-5 flex items-center gap-6">
        <div className="relative shrink-0">
          <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label="Répartition">
            {total > 0 ? (
              segments.map((sg) =>
                sg.path ? <path key={sg.key} d={sg.path} fill={sg.color} /> : null,
              )
            ) : (
              <circle cx={CX} cy={CY} r={R_OUT - 5} fill="#F1F5F9" />
            )}
            <circle cx={CX} cy={CY} r={R_IN - 6} fill="white" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="font-display text-2xl font-bold text-ink">{total}</p>
            <p className="text-[10px] uppercase tracking-widest text-ink-subtle">Sociétés</p>
          </div>
        </div>

        <ul className="flex-1 space-y-2">
          {segments.map((s) => (
            <li key={s.key} className="flex items-center gap-3">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-ink">{s.label}</p>
                <p className="text-xs text-ink-subtle">
                  {s.count} · {(s.pct * 100).toFixed(0)} %
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
