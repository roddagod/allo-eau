'use client';

import { useState, useTransition } from 'react';
import { updateOrderStatusAction } from '@/lib/order-actions';
import type { OrderStatus } from '@eaupourtous/domain/order-status';

/**
 * Barre d'actions statut collée en bas du détail commande.
 * Enchainement contextuel :
 *   driver_assigned → driver_en_route → arrived_nearby → delivered
 *   à tout moment : incident
 */
export function StatusActions({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<'idle' | 'incident'>('idle');
  const [incidentType, setIncidentType] = useState('');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const transition = (next: 'driver_en_route' | 'arrived_nearby' | 'delivered') => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, next);
      if (!res.ok) setMessage(res.message ?? 'Erreur');
    });
  };

  const declareIncident = () => {
    if (!incidentType) {
      setMessage('Type d’incident requis.');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await updateOrderStatusAction(orderId, 'incident', {
        incidentType,
        incidentDetails,
      });
      if (!res.ok) setMessage(res.message ?? 'Erreur');
      else {
        setMode('idle');
        setIncidentType('');
        setIncidentDetails('');
      }
    });
  };

  if (mode === 'incident') {
    return (
      <div className="rounded-lg bg-danger p-4 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
          Signaler un incident
        </p>
        <div className="mt-3 space-y-2">
          {[
            'Client absent',
            'Adresse introuvable',
            'Paiement non reçu',
            'Incident véhicule',
            'Autre',
          ].map((t) => (
            <label
              key={t}
              className={
                'flex cursor-pointer items-center gap-3 rounded-lg p-2 ' +
                (incidentType === t ? 'bg-white text-danger' : 'bg-white/10')
              }
            >
              <input
                type="radio"
                name="incidentType"
                value={t}
                checked={incidentType === t}
                onChange={(e) => setIncidentType(e.target.value)}
                className="sr-only"
              />
              <span
                className={
                  'inline-block h-3 w-3 rounded-full ' +
                  (incidentType === t ? 'bg-danger' : 'bg-white/40')
                }
              />
              <span className="text-sm font-medium">{t}</span>
            </label>
          ))}
        </div>
        <textarea
          value={incidentDetails}
          onChange={(e) => setIncidentDetails(e.target.value)}
          placeholder="Détails (optionnel)…"
          rows={2}
          className="mt-3 w-full rounded-lg bg-white/10 p-2 text-sm placeholder-white/50"
        />
        {message && <p className="mt-2 text-sm">{message}</p>}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('idle')}
            className="rounded-lg bg-white/10 py-2 text-sm font-semibold"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={declareIncident}
            disabled={pending || !incidentType}
            className="rounded-lg bg-white py-2 text-sm font-semibold text-danger disabled:opacity-60"
          >
            {pending ? '…' : 'Confirmer'}
          </button>
        </div>
      </div>
    );
  }

  const done = currentStatus === 'delivered' || currentStatus === 'cancelled' || currentStatus === 'incident';

  if (done) {
    return (
      <div className="rounded-lg bg-white/10 p-4 text-center text-sm text-white/70">
        Commande finalisée — aucune action possible.
      </div>
    );
  }

  const next: { to: 'driver_en_route' | 'arrived_nearby' | 'delivered'; label: string } | null =
    currentStatus === 'driver_assigned' ? { to: 'driver_en_route', label: 'Je pars vers le client' } :
    currentStatus === 'driver_en_route' ? { to: 'arrived_nearby',  label: 'Je suis arrivé' } :
    currentStatus === 'arrived_nearby'  ? { to: 'delivered',       label: 'Livraison effectuée' } :
    null;

  return (
    <div className="rounded-lg bg-ink-soft p-3 shadow-xl ring-1 ring-white/10">
      {next && (
        <button
          type="button"
          onClick={() => transition(next.to)}
          disabled={pending}
          className="w-full rounded-lg bg-accent py-4 text-base font-bold text-white hover:bg-accent-700 disabled:opacity-70"
        >
          {pending ? 'Enregistrement…' : next.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => setMode('incident')}
        className="mt-2 w-full rounded-lg bg-white/5 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
      >
        Signaler un incident
      </button>
      {message && <p className="mt-2 text-center text-sm text-danger">{message}</p>}
    </div>
  );
}
