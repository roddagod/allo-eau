'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { setCompanyStatusAction } from '@/lib/company-actions';

type Status = 'pending_validation' | 'active' | 'suspended' | 'rejected' | 'deactivated';

const statusLabels: Record<Status, string> = {
  pending_validation: 'En attente',
  active:             'Active',
  suspended:          'Suspendue',
  rejected:           'Rejetée',
  deactivated:        'Désactivée',
};

const statusColors: Record<Status, string> = {
  pending_validation: 'bg-amber-100 text-amber-800',
  active:             'bg-emerald-100 text-emerald-800',
  suspended:          'bg-red-100 text-red-800',
  rejected:           'bg-slate-100 text-ink-muted',
  deactivated:        'bg-slate-100 text-ink-subtle',
};

export function CompanyStatusPanel({
  companyId,
  currentStatus,
  commercialName,
}: {
  companyId: string;
  currentStatus: Status;
  commercialName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const apply = (target: Exclude<Status, 'pending_validation'>) => {
    setMessage(null);
    startTransition(async () => {
      const res = await setCompanyStatusAction(companyId, target);
      if (!res.ok) setMessage(res.message ?? 'Erreur');
    });
  };

  return (
    <section className="rounded-lg bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-muted">Statut</h2>
          <div className="mt-2">
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[currentStatus]}`}>
              {statusLabels[currentStatus]}
            </span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink-subtle">
        Seule une société <span className="font-semibold text-ink-muted">active</span> peut recevoir des commandes.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {currentStatus !== 'active' && (
          <Button
            type="button"
            size="sm"
            onClick={() => apply('active')}
            loading={pending}
          >
            Activer {commercialName}
          </Button>
        )}
        {currentStatus === 'active' && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => apply('suspended')}
            loading={pending}
          >
            Suspendre
          </Button>
        )}
        {currentStatus === 'pending_validation' && (
          <Button
            type="button"
            size="sm"
            variant="danger"
            onClick={() => apply('rejected')}
            loading={pending}
          >
            Rejeter
          </Button>
        )}
        {currentStatus !== 'deactivated' && currentStatus !== 'pending_validation' && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => apply('deactivated')}
            loading={pending}
          >
            Désactiver
          </Button>
        )}
      </div>

      {message && <p className="mt-3 text-sm text-danger">{message}</p>}
    </section>
  );
}
