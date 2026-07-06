'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { updateDriverAction, type ActionResult } from '@/lib/driver-actions';

type Company = { id: string; commercial_name: string };
type Zone = { id: string; name: string; sector: string | null };

const INITIAL: ActionResult = { ok: true };

export function DriverEditForm({
  driverId,
  initial,
  companies,
  zones,
}: {
  driverId: string;
  initial: {
    firstName: string;
    lastName: string;
    phone: string;
    companyId: string;
    primaryZoneId: string | null;
  };
  companies: Company[];
  zones: Zone[];
}) {
  const [state, action, pending] = useActionState(updateDriverAction, INITIAL);
  const [open, setOpen] = useState(false);

  const zonesBySector = zones.reduce<Record<string, Zone[]>>((acc, z) => {
    const s = z.sector ?? 'Autre';
    (acc[s] ??= []).push(z);
    return acc;
  }, {});

  if (!open) {
    return (
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Modifier
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-lg bg-surface-muted p-4">
      <input type="hidden" name="driverId" value={driverId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="firstName" required>Prénom</Label>
          <Input id="firstName" name="firstName" required defaultValue={initial.firstName} />
        </div>
        <div>
          <Label htmlFor="lastName" required>Nom</Label>
          <Input id="lastName" name="lastName" required defaultValue={initial.lastName} />
        </div>
      </div>
      <div>
        <Label htmlFor="phone" required>Téléphone</Label>
        <Input id="phone" name="phone" type="tel" required defaultValue={initial.phone} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="companyId" required>Société d’attache</Label>
          <Select id="companyId" name="companyId" required defaultValue={initial.companyId}>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>{c.commercial_name}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="primaryZoneId">Quartier principal</Label>
          <Select id="primaryZoneId" name="primaryZoneId" defaultValue={initial.primaryZoneId ?? ''}>
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={pending}>Enregistrer</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
