export type SectorCoverage = {
  sector: string;
  total: number;
  covered: number;
};

export function SectorCoveragePanel({ sectors }: { sectors: SectorCoverage[] }) {
  return (
    <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
        Couverture par secteur
      </p>

      <ul className="mt-4 space-y-4">
        {sectors.map((s) => {
          const pct = s.total === 0 ? 0 : Math.round((s.covered / s.total) * 100);
          const fullCovered = pct >= 100;
          return (
            <li key={s.sector}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium text-ink">Secteur {s.sector}</span>
                <span className={fullCovered ? 'text-accent-700' : 'text-ink-muted'}>
                  <span className="font-display text-base font-bold">{pct}</span>
                  <span className="text-xs"> % · {s.covered}/{s.total}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={`h-full rounded-full ${fullCovered ? 'bg-accent' : 'bg-primary'}`}
                  style={{ width: `${Math.max(pct, 3)}%` }}
                  aria-hidden
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
