'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reassignOrderToDriverAction } from '@/lib/order-actions';

type DriverOption = {
  id: string;
  reference: string | null;
  name: string;
  status: 'available' | 'on_delivery' | 'off_duty' | 'suspended';
  activeOrders: number;
};

const STATUS_LABEL: Record<DriverOption['status'], string> = {
  available:   'Disponible',
  on_delivery: 'En livraison',
  off_duty:    'Hors service',
  suspended:   'Suspendu',
};

export function AssignDriverPanel({
  orderId,
  drivers,
  currentDriverId,
}: {
  orderId: string;
  drivers: DriverOption[];
  currentDriverId: string | null;
}) {
  const [driverId, setDriverId] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    if (!driverId) return;
    setMessage(null);
    startTransition(async () => {
      const res = await reassignOrderToDriverAction(orderId, driverId);
      setMessage({
        ok: res.ok,
        text: res.ok
          ? 'Livreur affecté. Il verra la commande sur son terminal.'
          : res.message ?? 'Erreur inconnue.',
      });
      if (res.ok) setDriverId('');
    });
  };

  return (
    <div className="mt-3 space-y-3">
      <div>
        <Label htmlFor="assign-driver">
          {currentDriverId ? 'Changer de livreur' : 'Attribuer à un livreur'}
        </Label>
        {drivers.length === 0 ? (
          <p className="mt-1 rounded-lg bg-surface-muted p-3 text-xs text-ink-subtle">
            Aucun livreur enregistré pour cette société. Créez-en un depuis la page « Livreurs ».
          </p>
        ) : (
          <Select
            id="assign-driver"
            value={driverId}
            onChange={(e) => setDriverId(e.target.value)}
          >
            <option value="" disabled>— Sélectionner un livreur —</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id} disabled={d.status === 'suspended'}>
                {d.reference ? `${d.reference} · ` : ''}{d.name}
                {' — '}{STATUS_LABEL[d.status]}
                {d.activeOrders > 0 && ` (${d.activeOrders} en cours)`}
                {d.id === currentDriverId ? ' — actuel' : ''}
              </option>
            ))}
          </Select>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          onClick={apply}
          loading={pending}
          disabled={!driverId || drivers.length === 0 || driverId === currentDriverId}
        >
          {currentDriverId ? 'Réaffecter' : 'Affecter le livreur'}
        </Button>
      </div>

      {message && (
        <p className={'text-sm ' + (message.ok ? 'text-accent-700' : 'text-danger')}>
          {message.text}
        </p>
      )}
    </div>
  );
}
