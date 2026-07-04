'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { acceptOrderAction, refuseOrderAction } from '@/lib/order-actions';

/**
 * Panel admin agissant en proxy société : accepter ou refuser au nom de la société.
 * En cas de refus, le trigger DB déclenche la cascade de re-dispatch automatique.
 */
export function AcceptRefusePanel({ orderId }: { orderId: string }) {
  const [mode, setMode] = useState<'idle' | 'refusing'>('idle');
  const [reason, setReason] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const accept = () => {
    setError(null);
    startTransition(async () => {
      const res = await acceptOrderAction(orderId);
      if (!res.ok) setError(res.message ?? 'Erreur');
    });
  };

  const refuse = () => {
    if (reason.trim().length < 3) {
      setError('Motif requis.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await refuseOrderAction(orderId, reason.trim());
      if (!res.ok) setError(res.message ?? 'Erreur');
      else {
        setMode('idle');
        setReason('');
      }
    });
  };

  if (mode === 'refusing') {
    return (
      <div className="w-full max-w-sm space-y-2">
        <Textarea
          placeholder="Motif du refus (ex. hors zone, cuve indisponible…)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" size="sm" onClick={refuse} loading={pending}>
            Confirmer le refus
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setMode('idle'); setReason(''); setError(null); }}>
            Annuler
          </Button>
        </div>
        <p className="text-xs text-ink-subtle">
          Le refus déclenchera automatiquement une re-attribution à la meilleure société suivante.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={accept} loading={pending}>
        Accepter (proxy)
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setMode('refusing')}>
        Refuser
      </Button>
      {error && <p className="w-full text-sm text-danger">{error}</p>}
    </div>
  );
}
