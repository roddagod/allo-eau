'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { createPriceVersionAction, type ActionResult } from '@/lib/price-actions';

type Tier = { id: string; label: string; volume_liters: number };

const INITIAL: ActionResult = { ok: true };

export function NewPriceVersionPanel({ tiers }: { tiers: Tier[] }) {
  const [state, action, pending] = useActionState(createPriceVersionAction, INITIAL);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <section className="rounded-lg bg-primary-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">
              Super administrateur
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink">
              Modifier un tarif officiel
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Toute nouvelle version clôt automatiquement la précédente et est journalisée
              comme action sensible.
            </p>
          </div>
          <Button size="lg" onClick={() => setOpen(true)}>
            Nouvelle version tarifaire
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-lg bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Nouvelle version
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink">Publier un nouveau tarif</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Annuler
        </button>
      </div>

      <form
        action={async (fd) => {
          await action(fd);
          if (state.ok !== false) setOpen(false);
        }}
        className="mt-5 space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="tier_id" required>Palier</Label>
            <Select id="tier_id" name="tier_id" required defaultValue="">
              <option value="" disabled>Choisir un palier</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="price_fcfa" required>Nouveau prix (FCFA)</Label>
            <Input
              id="price_fcfa"
              name="price_fcfa"
              type="number"
              min={0}
              step={100}
              placeholder="Ex. 4000"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="valid_from">Date d’entrée en vigueur</Label>
          <Input
            id="valid_from"
            name="valid_from"
            type="datetime-local"
            defaultValue={new Date().toISOString().slice(0, 16)}
          />
          <p className="mt-1 text-xs text-ink-subtle">
            Par défaut : maintenant. La version précédente sera clôturée à cette date.
          </p>
        </div>

        <div>
          <Label htmlFor="reason" required>Motif</Label>
          <Textarea
            id="reason"
            name="reason"
            required
            placeholder="Ex. Communiqué de presse N°3 du Cabinet du Ministre du 15/07/2026 — révision..."
            minLength={10}
          />
        </div>

        <div>
          <Label htmlFor="reference_doc">Référence du document source</Label>
          <Input
            id="reference_doc"
            name="reference_doc"
            placeholder="Ex. Cabinet du Ministre — Communiqué N°3 · ou URL"
          />
        </div>

        <FieldError message={state.message} />

        <div className="flex flex-wrap gap-3 pt-2">
          <Button type="submit" size="lg" loading={pending}>Publier la version</Button>
          <Button type="button" variant="ghost" size="lg" onClick={() => setOpen(false)}>
            Annuler
          </Button>
        </div>
      </form>
    </section>
  );
}
