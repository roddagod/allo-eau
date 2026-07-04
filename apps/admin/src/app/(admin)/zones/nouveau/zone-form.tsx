'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { createZoneAction, type ActionResult } from '@/lib/zone-actions';

const INITIAL: ActionResult = { ok: true };
const SECTORS = ['Nord', 'Centre', 'Est', 'Sud', 'Autre'] as const;

export function ZoneForm() {
  const [state, action, pending] = useActionState(createZoneAction, INITIAL);

  return (
    <form action={action} className="space-y-4">
      <div>
        <Label htmlFor="name" required>Nom du quartier</Label>
        <Input id="name" name="name" required autoFocus placeholder="Ex. Akébé Ville" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="sector" required>Secteur</Label>
          <Select id="sector" name="sector" required defaultValue="Centre">
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Statut</Label>
          <Select id="status" name="status" defaultValue="active">
            <option value="active">Active</option>
            <option value="draft">Brouillon</option>
            <option value="inactive">Inactive</option>
          </Select>
        </div>
      </div>

      <FieldError message={state.message} />

      <div className="flex gap-3 pt-2">
        <Button type="submit" size="lg" loading={pending}>Créer le quartier</Button>
      </div>
    </form>
  );
}
