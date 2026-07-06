'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { suspendDriverAction, reactivateDriverAction } from '@/lib/driver-actions';

export function SuspendToggle({
  driverId,
  status,
}: {
  driverId: string;
  status: 'available' | 'on_delivery' | 'off_duty' | 'suspended';
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const suspended = status === 'suspended';

  const toggle = () => {
    if (!suspended) {
      const ok = window.confirm(
        'Suspendre ce livreur ? Il ne recevra plus de nouvelles commandes. Ses commandes en cours restent affectées.',
      );
      if (!ok) return;
    }
    setError(null);
    startTransition(async () => {
      const res = suspended
        ? await reactivateDriverAction(driverId)
        : await suspendDriverAction(driverId);
      if (!res.ok) setError(res.message ?? 'Erreur inconnue.');
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant={suspended ? 'primary' : 'danger'}
        size="sm"
        onClick={toggle}
        loading={pending}
      >
        {suspended ? 'Réactiver' : 'Suspendre'}
      </Button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
