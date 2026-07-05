'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { createDriverAction, type ActionResult } from '@/lib/driver-actions';

type Company = { id: string; commercial_name: string };
type Zone = { id: string; name: string; sector: string | null };

const INITIAL: ActionResult = { ok: true };

export function DriverCreateForm({
  companies,
  zones,
  defaultCompanyId,
}: {
  companies: Company[];
  zones: Zone[];
  defaultCompanyId: string;
}) {
  const [state, action, pending] = useActionState(createDriverAction, INITIAL);

  const zonesBySector = zones.reduce<Record<string, Zone[]>>((acc, z) => {
    const s = z.sector ?? 'Autre';
    (acc[s] ??= []).push(z);
    return acc;
  }, {});

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName" required>Prénom</Label>
          <Input id="firstName" name="firstName" required autoFocus autoComplete="given-name" />
        </div>
        <div>
          <Label htmlFor="lastName" required>Nom</Label>
          <Input id="lastName" name="lastName" required autoComplete="family-name" />
        </div>
      </div>
      <div>
        <Label htmlFor="phone" required>Téléphone</Label>
        <Input id="phone" name="phone" type="tel" required placeholder="07 XX XX XX XX" />
        <p className="mt-1 text-xs text-ink-subtle">
          Les identifiants seront envoyés par SMS à ce numéro.
        </p>
      </div>
      <div>
        <Label htmlFor="email">Email (facultatif)</Label>
        <Input id="email" name="email" type="email" placeholder="Généré automatiquement si vide" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="companyId" required>Société d’attache</Label>
          <Select id="companyId" name="companyId" required defaultValue={defaultCompanyId}>
            <option value="" disabled>Choisir une société</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.commercial_name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="primaryZoneId">Quartier principal</Label>
          <Select id="primaryZoneId" name="primaryZoneId" defaultValue="">
            <option value="">Aucun</option>
            {Object.entries(zonesBySector).map(([sector, list]) => (
              <optgroup key={sector} label={`Secteur ${sector}`}>
                {list.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </optgroup>
            ))}
          </Select>
        </div>
      </div>

      <FieldError message={state.message} />

      <div className="flex gap-3 pt-2">
        <Button type="submit" size="lg" loading={pending}>Créer le livreur</Button>
      </div>
    </form>
  );
}
