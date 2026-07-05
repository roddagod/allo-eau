'use client';

import { useTransition, useState } from 'react';
import { setDriverStatusAction } from '@/lib/order-actions';

type Status = 'available' | 'on_delivery' | 'off_duty' | 'suspended';

const LABELS: Record<Status, string> = {
  available:   'Disponible',
  on_delivery: 'En livraison',
  off_duty:    'Hors service',
  suspended:   'Suspendu',
};

const DOT: Record<Status, string> = {
  available:   'bg-accent',
  on_delivery: 'bg-amber-400',
  off_duty:    'bg-white/40',
  suspended:   'bg-danger',
};

export function DriverStatusToggle({
  driverId,
  initialStatus,
}: {
  driverId: string;
  initialStatus: Status;
}) {
  const [status, setStatus] = useState<Status>(initialStatus);
  const [pending, startTransition] = useTransition();

  type ToggleTarget = 'available' | 'on_delivery' | 'off_duty';
  const cycle = (): ToggleTarget | null => {
    if (status === 'available')   return 'off_duty';
    if (status === 'off_duty')    return 'available';
    if (status === 'on_delivery') return 'off_duty';
    return null;
  };

  const next = cycle();

  return (
    <button
      type="button"
      onClick={() => {
        if (!next || pending) return;
        setStatus(next);
        startTransition(async () => {
          const res = await setDriverStatusAction(driverId, next);
          if (!res.ok) setStatus(status); // rollback si erreur
        });
      }}
      disabled={!next || pending}
      className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/15 disabled:opacity-60"
    >
      <span className={`relative flex h-2 w-2 ${status === 'available' ? '' : ''}`}>
        {status === 'available' && (
          <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-accent opacity-70" />
        )}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${DOT[status]}`} />
      </span>
      {LABELS[status]}
    </button>
  );
}
