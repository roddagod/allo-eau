'use client';

import { useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setCompanyZonesAction } from '@/lib/company-actions';

type Zone = { id: string; name: string; sector: string | null };

export function CompanyZonesPanel({
  companyId,
  zones,
  assignedIds,
}: {
  companyId: string;
  zones: Zone[];
  assignedIds: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(assignedIds));
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const zonesBySector = useMemo(() => {
    return zones.reduce<Record<string, Zone[]>>((acc, z) => {
      const sector = z.sector ?? 'Autre';
      (acc[sector] ??= []).push(z);
      return acc;
    }, {});
  }, [zones]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllSector = (sector: string) => {
    const ids = zonesBySector[sector]?.map((z) => z.id) ?? [];
    setSelected((prev) => new Set([...prev, ...ids]));
  };

  const clearAllSector = (sector: string) => {
    const ids = new Set(zonesBySector[sector]?.map((z) => z.id) ?? []);
    setSelected((prev) => new Set([...prev].filter((id) => !ids.has(id))));
  };

  const save = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await setCompanyZonesAction(companyId, Array.from(selected));
      if (!res.ok) setMessage(res.message ?? 'Erreur');
      else setMessage(`${selected.size} zone(s) enregistrée(s).`);
    });
  };

  const hasChanges = useMemo(() => {
    if (selected.size !== assignedIds.length) return true;
    return assignedIds.some((id) => !selected.has(id));
  }, [selected, assignedIds]);

  return (
    <section className="rounded-lg bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-muted">Zones couvertes</h2>
          <p className="mt-1 text-xs text-ink-subtle">
            {selected.size} zone{selected.size !== 1 ? 's' : ''} sélectionnée{selected.size !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={!hasChanges}
          loading={pending}
        >
          Enregistrer
        </Button>
      </div>

      <div className="mt-5 space-y-5">
        {Object.entries(zonesBySector).map(([sector, list]) => {
          const allSelected = list.every((z) => selected.has(z.id));
          return (
            <div key={sector}>
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-subtle">
                  {sector}
                </h3>
                <button
                  type="button"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => (allSelected ? clearAllSector(sector) : selectAllSector(sector))}
                >
                  {allSelected ? 'Tout retirer' : 'Tout sélectionner'}
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {list.map((z) => {
                  const active = selected.has(z.id);
                  return (
                    <label
                      key={z.id}
                      className={
                        'flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ' +
                        (active
                          ? 'border-primary bg-primary/5'
                          : 'border-surface-border bg-white hover:border-surface-border')
                      }
                    >
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => toggle(z.id)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="truncate">{z.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <p className={`mt-4 text-sm ${message.includes('enregistrée') ? 'text-accent-700' : 'text-danger'}`}>
          {message}
        </p>
      )}
    </section>
  );
}
