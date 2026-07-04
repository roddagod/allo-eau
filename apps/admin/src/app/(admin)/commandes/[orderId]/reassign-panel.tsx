'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { reassignOrderAction } from '@/lib/order-actions';

type Company = { id: string; commercial_name: string; operator_type: string };

export function ReassignPanel({
  orderId,
  candidates,
}: {
  orderId: string;
  candidates: Company[];
}) {
  const [companyId, setCompanyId] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const apply = () => {
    if (!companyId) return;
    setMessage(null);
    startTransition(async () => {
      const res = await reassignOrderAction(orderId, companyId);
      setMessage({
        ok: res.ok,
        text: res.ok
          ? 'Commande réassignée. La société recevra une notification.'
          : res.message ?? 'Erreur inconnue.',
      });
      if (res.ok) setCompanyId('');
    });
  };

  return (
    <div className="mt-3 space-y-3">
      <div>
        <Label htmlFor="reassign">Choisir une société éligible</Label>
        {candidates.length === 0 ? (
          <p className="mt-1 rounded-lg bg-surface-muted p-3 text-xs text-ink-subtle">
            Aucune société active ne couvre encore ce quartier. Activez une société sur la zone
            depuis la page « Sociétés ».
          </p>
        ) : (
          <Select
            id="reassign"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
          >
            <option value="" disabled>— Sélectionner —</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>
                {c.commercial_name} ({c.operator_type})
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
          disabled={!companyId || candidates.length === 0}
        >
          Réassigner à cette société
        </Button>
      </div>

      {message && (
        <p
          className={
            'text-sm ' + (message.ok ? 'text-accent-700' : 'text-danger')
          }
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
